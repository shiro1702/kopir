import { timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'
import { detectDocumentKind, mimeTypeForKind } from '../file-types'
import { getStaffMaxUserId } from '../payment-mode'
import type { MessengerAdapter, MessengerReplyTarget } from '../bot/types'
import { getMaxClient } from './client'
import type { MaxAttachment, MaxUpdate } from './types'

function createMaxAdapter(): MessengerAdapter {
  const client = getMaxClient()
  return {
    platform: 'max',
    async sendText(target: MessengerReplyTarget, text: string) {
      await client.sendMessage({ chatId: Number(target.chatId) }, text)
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
      if (!staffMaxUserId || callback.user.user_id !== staffMaxUserId) {
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
