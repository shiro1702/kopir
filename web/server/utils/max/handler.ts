import { timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'
import { detectDocumentKind, mimeTypeForKind } from '../file-types'
import { BTN_CANCEL_BATCH, BTN_FINALIZE_BATCH } from '../bot/messages'
import { getStaffMaxUserId } from '../payment-mode'
import type { MessengerAdapter, MessengerReplyTarget } from '../bot/types'
import { getMaxClient } from './client'
import type { MaxAttachment, MaxInlineKeyboardAttachment, MaxUpdate } from './types'

function batchInlineKeyboard(): MaxInlineKeyboardAttachment {
  return {
    type: 'inline_keyboard',
    payload: {
      buttons: [
        [
          { type: 'callback', text: BTN_FINALIZE_BATCH, payload: 'batch_finalize', intent: 'default' },
          { type: 'callback', text: BTN_CANCEL_BATCH, payload: 'batch_cancel', intent: 'default' },
        ],
      ],
    },
  }
}

function createMaxAdapter(): MessengerAdapter {
  const client = getMaxClient()
  return {
    platform: 'max',
    async sendText(target: MessengerReplyTarget, text: string, options?) {
      await client.sendMessage(
        { chatId: Number(target.chatId) },
        text,
        options?.showBatchActions ? [batchInlineKeyboard()] : undefined,
      )
    },
  }
}

function verifyMaxWebhookSecret(header: string | undefined): boolean {
  const config = useRuntimeConfig()
  const secret = config.maxWebhookSecret
  if (!secret) {
    return true
  }
  if (!header || header.length !== secret.length) {
    return false
  }
  return timingSafeEqual(Buffer.from(header), Buffer.from(secret))
}

function parseStartPayload(text: string | undefined): string | undefined {
  if (!text) {
    return undefined
  }
  const trimmed = text.trim()
  if (!trimmed.startsWith('/start')) {
    return undefined
  }
  const parts = trimmed.split(/\s+/)
  return parts[1]
}

function findFileAttachment(attachments: MaxAttachment[] | undefined) {
  return attachments?.find((attachment) => attachment.type === 'file')
}

function isBatchActionText(text: string): 'finalize' | 'cancel' | null {
  const trimmed = text.trim()
  if (trimmed === BTN_FINALIZE_BATCH) {
    return 'finalize'
  }
  if (trimmed === BTN_CANCEL_BATCH) {
    return 'cancel'
  }
  return null
}

export async function handleMaxUpdate(update: MaxUpdate): Promise<void> {
  const adapter = createMaxAdapter()
  const client = getMaxClient()

  switch (update.update_type) {
    case 'bot_started': {
      if (!update.chat_id) {
        return
      }
      const target: MessengerReplyTarget = {
        platform: 'max',
        chatId: String(update.chat_id),
      }
      const { handleStart } = await import('../bot/core')
      await handleStart('max', target, update.payload, adapter)
      return
    }

    case 'message_created': {
      const message = update.message
      if (!message?.recipient?.chat_id || !message.sender?.user_id) {
        return
      }

      const chatId = message.recipient.chat_id
      const sender = message.sender
      const target: MessengerReplyTarget = {
        platform: 'max',
        chatId: String(chatId),
      }
      const user = {
        externalId: String(sender.user_id),
        username: sender.username ?? null,
        firstName: sender.first_name ?? sender.name ?? null,
      }

      const startPayload = parseStartPayload(message.body?.text)
      if (startPayload !== undefined || message.body?.text?.trim() === '/start') {
        const { handleStart } = await import('../bot/core')
        await handleStart('max', target, startPayload, adapter)
        return
      }

      const textAction = message.body?.text ? isBatchActionText(message.body.text) : null
      if (textAction) {
        const { handleBatchAction } = await import('../bot/core')
        await handleBatchAction('max', target, user, textAction, adapter)
        return
      }

      const fileAttachment = findFileAttachment(message.body?.attachments)
      if (!fileAttachment?.payload?.url) {
        return
      }

      const fileName = fileAttachment.filename ?? 'document.pdf'
      const kind = detectDocumentKind(fileName)
      const mimeType = mimeTypeForKind(kind === 'unsupported' ? 'pdf' : kind, fileName)

      const { handleDocument } = await import('../bot/core')
      await handleDocument(
        'max',
        target,
        user,
        {
          fileName,
          mimeType,
          download: () => client.downloadFile(fileAttachment.payload!.url!),
        },
        adapter,
      )
      return
    }

    case 'message_callback': {
      const callback = update.callback
      if (!callback?.callback_id || !callback.payload) {
        return
      }

      const staffMaxUserId = getStaffMaxUserId()
      const isStaff = staffMaxUserId && callback.user.user_id === staffMaxUserId

      if (callback.payload === 'batch_finalize' || callback.payload === 'batch_cancel') {
        if (isStaff) {
          await client.answerCallback(callback.callback_id, 'Нет доступа')
          return
        }
        const chatId = update.message?.recipient?.chat_id ?? update.chat_id
        if (!chatId) {
          await client.answerCallback(callback.callback_id, 'Ошибка чата')
          return
        }
        const target: MessengerReplyTarget = {
          platform: 'max',
          chatId: String(chatId),
        }
        const user = {
          externalId: String(callback.user.user_id),
          username: callback.user.username ?? null,
          firstName: callback.user.first_name ?? callback.user.name ?? null,
        }
        const action = callback.payload === 'batch_finalize' ? 'finalize' : 'cancel'
        try {
          const { handleBatchAction } = await import('../bot/core')
          await handleBatchAction('max', target, user, action, adapter)
          await client.answerCallback(callback.callback_id, action === 'finalize' ? 'Пачка собрана' : 'Пачка отменена')
        } catch (error) {
          const text = error instanceof Error ? error.message : 'Ошибка'
          await client.answerCallback(callback.callback_id, text)
        }
        return
      }

      if (!isStaff) {
        await client.answerCallback(callback.callback_id, 'Нет доступа')
        return
      }

      try {
        const { handleStaffCallbackPayload } = await import('../staff-actions')
        const message = await handleStaffCallbackPayload(callback.payload)
        await client.answerCallback(callback.callback_id, message)
      } catch (error) {
        let text = 'Ошибка'
        if (error && typeof error === 'object' && 'data' in error) {
          const data = (error as { data?: { error?: string } }).data
          if (data?.error) {
            text = data.error
          }
        } else if (error instanceof Error) {
          text = error.message
        }
        await client.answerCallback(callback.callback_id, text)
      }
      return
    }

    default:
      return
  }
}

export function assertMaxWebhookAuth(event: H3Event): void {
  const secretHeader = getHeader(event, 'x-max-bot-api-secret')
  if (!verifyMaxWebhookSecret(secretHeader)) {
    throw createError({
      statusCode: 403,
      data: { error: 'Invalid MAX webhook secret', code: 'FORBIDDEN' },
    })
  }
}
