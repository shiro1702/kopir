import { timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'
import { detectDocumentKind, mimeTypeForKind } from '../file-types'
import {
  isBatchClientCallbackPayload,
  isPaymentClientCallbackPayload,
  parseBatchRemoveCancelOrderId,
  parseBatchRemoveConfirmOrderId,
  parseBatchRemoveOrderId,
  parsePayChangeMethodPayload,
  parsePayClaimedPayload,
  parsePayMethodPayload,
} from '../bot/keyboards'
import type {
  BatchKeyboardMode,
  CallbackContext,
  MessengerAdapterWithCallbacks,
  MessengerReplyTarget,
  SentMessage,
} from '../bot/types'
import { editMaxStatusMessage, getMaxClient, maxAttachmentsFromOptions, sendMaxStatusMessage } from './client'

import { BTN_CANCEL_BATCH, BTN_FINALIZE_BATCH, MSG_BATCH_CONTROLS } from '../bot/messages'
import { downloadMaxFileAttachment, resolveFileAttachment } from './files'
import { getStaffMaxUserId } from '../payment-mode'
import type { MaxUpdate } from './types'

function maxSendOptionsAttachments(options?: {
  batchKeyboard?: BatchKeyboardMode
  inlineKeyboard?: import('../bot/types').InlineKeyboardButton[][]
}): unknown[] | undefined {
  return maxAttachmentsFromOptions(options)
}

function createMaxAdapter(): MessengerAdapterWithCallbacks {
  const client = getMaxClient()
  return {
    platform: 'max',
    async sendText(target: MessengerReplyTarget, text: string, options?) {
      const attachments = maxSendOptionsAttachments(options)
      const messageText = text.trim() ? text : MSG_BATCH_CONTROLS
      await client.sendMessage(
        { chatId: Number(target.chatId) },
        messageText,
        attachments,
      )
    },
    async sendStatus(target, text, options?) {
      return sendMaxStatusMessage(Number(target.chatId), text, options)
    },
    async editStatus(target, message, text, options?) {
      await editMaxStatusMessage(message, text, options)
    },
    async answerCallback(ctx: CallbackContext, text?: string) {
      await client.answerCallback(ctx.callbackId, text ?? '')
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

      const fileAttachment = resolveFileAttachment(message)
      if (!fileAttachment || (!fileAttachment.payload?.url && !fileAttachment.payload?.token)) {
        return
      }

      let downloaded: { buffer: Buffer, fileName: string }
      try {
        downloaded = await downloadMaxFileAttachment(client, message, fileAttachment)
      } catch (error) {
        console.error('[max] attachment download failed:', error)
        const { MSG_UPLOAD_FAILED } = await import('../bot/messages')
        await adapter.sendText(target, MSG_UPLOAD_FAILED)
        return
      }

      const fileName = downloaded.fileName
      const kindHint = detectDocumentKind(fileName)
      const mimeType = mimeTypeForKind(kindHint === 'unsupported' ? 'pdf' : kindHint, fileName)

      const { handleDocument } = await import('../bot/core')
      await handleDocument(
        'max',
        target,
        user,
        {
          fileName,
          mimeType,
          download: async () => downloaded.buffer,
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
          if (action === 'finalize') {
            await client.answerCallback(callback.callback_id, 'Собираем пачку…')
          }
          const { handleBatchAction } = await import('../bot/core')
          await handleBatchAction('max', target, user, action, adapter)
          if (action === 'cancel') {
            await client.answerCallback(callback.callback_id, 'Пачка отменена')
          }
        } catch (error) {
          const text = error instanceof Error ? error.message : 'Ошибка'
          await client.answerCallback(callback.callback_id, text)
        }
        return
      }

      if (!isStaff && (isBatchClientCallbackPayload(callback.payload) || isPaymentClientCallbackPayload(callback.payload))) {
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
        const messageId = update.message?.body?.mid
        const message: SentMessage | undefined = messageId
          ? { messageId, chatId: String(chatId) }
          : undefined
        const callbackCtx: CallbackContext = {
          callbackId: callback.callback_id,
          chatId: String(chatId),
          messageId,
        }

        try {
          const payload = callback.payload
          let toast = ''
          if (parseBatchRemoveOrderId(payload)) {
            const { handleBatchRemoveRequest } = await import('../bot/core')
            toast = await handleBatchRemoveRequest(
              target,
              user,
              parseBatchRemoveOrderId(payload)!,
              adapter,
              callbackCtx,
              message,
            )
          } else if (parseBatchRemoveConfirmOrderId(payload)) {
            const { handleBatchRemoveConfirm } = await import('../bot/core')
            toast = await handleBatchRemoveConfirm(
              target,
              user,
              parseBatchRemoveConfirmOrderId(payload)!,
              adapter,
              callbackCtx,
              message,
            )
          } else if (parseBatchRemoveCancelOrderId(payload)) {
            const { handleBatchRemoveCancel } = await import('../bot/core')
            toast = await handleBatchRemoveCancel(
              target,
              user,
              parseBatchRemoveCancelOrderId(payload)!,
              adapter,
              callbackCtx,
              message,
            )
          }
          await client.answerCallback(callback.callback_id, toast)
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
