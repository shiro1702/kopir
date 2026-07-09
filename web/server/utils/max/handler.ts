import { timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'
import { detectDocumentKind, mimeTypeForKind } from '../file-types'
import {
  isBatchClientCallbackPayload,
  isPaymentClientCallbackPayload,
  isPointClientCallbackPayload,
  isPrintRetryClientCallbackPayload,
} from '../bot/keyboards'
import { isClientCommandCallback, parseClientCommandText } from '../bot/client-commands'
import { isPartnerCommandCallback, parsePartnerCommandText } from '../bot/partner-commands'
import { isPartnerCallbackPayload } from '../bot/partner-keyboards'
import type {
  BatchKeyboardMode,
  CallbackContext,
  MessengerAdapterWithCallbacks,
  MessengerReplyTarget,
  SentMessage,
} from '../bot/types'
import { editMaxStatusMessage, getMaxClient, maxAttachmentsFromOptions, sendMaxStatusMessage } from './client'

import { BTN_CANCEL_BATCH, BTN_FINALIZE_BATCH, MSG_BATCH_BATCH_CANCELLED_ACTION, MSG_BATCH_CONTROLS, MSG_BATCH_FINALIZING } from '../bot/messages'
import { downloadMaxFileAttachment, resolveFileAttachment } from './files'
import { getStaffMaxUserId } from '../payment-mode'
import { assertStaffForPayload } from '../staff-auth'
import type { MaxUpdate } from './types'

function maxSendOptionsAttachments(options?: {
  batchKeyboard?: BatchKeyboardMode
  inlineKeyboard?: import('../bot/types').InlineKeyboardButton[][]
  clientMenu?: boolean
  partnerMenu?: boolean
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
      const user = update.user
        ? {
            externalId: String(update.user.user_id),
            username: update.user.username ?? null,
            firstName: update.user.first_name ?? update.user.name ?? null,
          }
        : undefined
      const { handleStart } = await import('../bot/core')
      await handleStart('max', target, update.payload, adapter, user)
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
        await handleStart('max', target, startPayload, adapter, user)
        return
      }

      const bindMatch = message.body?.text?.trim().match(/^\/bind(?:@\S+)?\s+(\S+)/)
      if (bindMatch) {
        try {
          const { handleBind } = await import('../bot/core')
          await handleBind('max', target, bindMatch[1], adapter, user)
        } catch (error) {
          let text = 'Не удалось привязать канал'
          if (error && typeof error === 'object' && 'data' in error) {
            const data = (error as { data?: { error?: string } }).data
            if (data?.error) {
              text = data.error
            }
          } else if (error instanceof Error) {
            text = error.message
          }
          await client.sendMessage({ chatId }, text)
        }
        return
      }

      const partnerMatch = message.body?.text?.trim().match(/^\/partner(?:@\S+)?(?:\s+([\s\S]+))?$/)
      if (partnerMatch) {
        try {
          const { handlePartnerCommand } = await import('../bot/core')
          const arg = partnerMatch[1]?.trim() || undefined
          await handlePartnerCommand('max', target, arg, adapter, user)
        } catch (error) {
          const text = error instanceof Error ? error.message : 'Ошибка'
          await client.sendMessage({ chatId }, text)
        }
        return
      }

      const clientCommand = message.body?.text ? parseClientCommandText(message.body.text) : null
      if (clientCommand) {
        const { handleClientCommand } = await import('../bot/client-commands')
        await handleClientCommand(clientCommand, 'max', target, user, adapter)
        return
      }

      const partnerCommand = message.body?.text ? parsePartnerCommandText(message.body.text) : null
      if (partnerCommand) {
        const { handlePartnerQuickCommand } = await import('../bot/partner-commands')
        await handlePartnerQuickCommand(partnerCommand, 'max', target, user, adapter)
        return
      }

      const textAction = message.body?.text ? isBatchActionText(message.body.text) : null
      if (textAction) {
        const { handleBatchAction } = await import('../bot/core')
        await handleBatchAction('max', target, user, textAction, adapter)
        return
      }

      const plainText = message.body?.text?.trim()
      if (plainText && /^\d{2,4}$/.test(plainText)) {
        const { handleDisplayCodeMessage } = await import('../bot/point-selection')
        const handled = await handleDisplayCodeMessage(target, user, plainText, adapter)
        if (handled) {
          return
        }
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
      const isLegacyStaff = staffMaxUserId && callback.user.user_id === staffMaxUserId

      const isPartnerCallback = isPartnerCallbackPayload(callback.payload)
      const isStaffCallback = !isPartnerCallback
        && !isClientCommandCallback(callback.payload)
        && !isPartnerCommandCallback(callback.payload)
        && !isBatchClientCallbackPayload(callback.payload)
        && !isPaymentClientCallbackPayload(callback.payload)
        && !isPrintRetryClientCallbackPayload(callback.payload)
        && !isPointClientCallbackPayload(callback.payload)
        && !callback.payload.startsWith('batch_')

      if (callback.payload === 'batch_finalize' || callback.payload === 'batch_cancel') {
        if (isLegacyStaff) {
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
            await client.answerCallback(callback.callback_id, MSG_BATCH_FINALIZING)
          }
          const { handleBatchAction } = await import('../bot/core')
          await handleBatchAction('max', target, user, action, adapter)
          if (action === 'cancel') {
            await client.answerCallback(callback.callback_id, MSG_BATCH_BATCH_CANCELLED_ACTION)
          }
        } catch (error) {
          const text = error instanceof Error ? error.message : 'Ошибка'
          await client.answerCallback(callback.callback_id, text)
        }
        return
      }

      if (!isStaffCallback && (
        isClientCommandCallback(callback.payload)
        || isPartnerCommandCallback(callback.payload)
        || isBatchClientCallbackPayload(callback.payload)
        || isPaymentClientCallbackPayload(callback.payload)
        || isPrintRetryClientCallbackPayload(callback.payload)
        || isPointClientCallbackPayload(callback.payload)
      )) {
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
          const result = await routeClientCallback(
            callback.payload,
            target,
            user,
            adapter,
            callbackCtx,
            message,
          )
          await client.answerCallback(callback.callback_id, result.toast ?? '')
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

      if (isPartnerCallback) {
        const chatId = update.message?.recipient?.chat_id ?? update.chat_id
        if (!chatId) {
          await client.answerCallback(callback.callback_id, 'Ошибка чата')
          return
        }
        const target: MessengerReplyTarget = {
          platform: 'max',
          chatId: String(chatId),
        }
        const messageId = update.message?.body?.mid
        const message: SentMessage | undefined = messageId
          ? { messageId, chatId: String(chatId) }
          : undefined

        try {
          const { assertPartnerForPayload, handlePartnerCallbackPayload } = await import('../partner-actions')
          await assertPartnerForPayload('max', BigInt(callback.user.user_id), callback.payload)
          const screen = await handlePartnerCallbackPayload(
            'max',
            BigInt(callback.user.user_id),
            callback.payload,
          )
          if (message) {
            await adapter.editStatus(target, message, screen.text, {
              inlineKeyboard: screen.keyboard,
            })
          } else {
            await adapter.sendText(target, screen.text, { inlineKeyboard: screen.keyboard })
          }
          await client.answerCallback(callback.callback_id, 'Готово')
        } catch (error) {
          const text = error instanceof Error ? error.message : 'Ошибка'
          await client.answerCallback(callback.callback_id, text)
        }
        return
      }

      if (!isStaffCallback) {
        await client.answerCallback(callback.callback_id, 'Нет доступа')
        return
      }

      try {
        await assertStaffForPayload('max', callback.user.user_id, callback.payload)
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
