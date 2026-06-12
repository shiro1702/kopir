import { timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'
import { handlePdfDocument, handleStart } from '../bot/core'
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
        await handleStart('max', target, startPayload, adapter)
        return
      }

      const fileAttachment = findFileAttachment(message.body?.attachments)
      if (!fileAttachment?.payload?.url) {
        return
      }

      await handlePdfDocument(
        'max',
        target,
        user,
        {
          fileName: fileAttachment.filename ?? 'document.pdf',
          download: () => client.downloadFile(fileAttachment.payload!.url!),
        },
        adapter,
      )
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
