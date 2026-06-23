import { Bot, InlineKeyboard, Keyboard } from 'grammy'
import type {
  BatchKeyboardMode,
  CallbackContext,
  MessengerAdapterWithCallbacks,
  MessengerReplyTarget,
  SentMessage,
  StatusMessageOptions,
  TypingAction,
} from '../bot/types'
import { BTN_CANCEL_BATCH, BTN_FINALIZE_BATCH } from '../bot/messages'
import {
  BATCH_REMOVE_CANCEL_PREFIX,
  isBatchClientCallbackPayload,
  parseBatchRemoveCancelOrderId,
  parseBatchRemoveConfirmOrderId,
  parseBatchRemoveOrderId,
} from '../bot/keyboards'
import { getStaffTelegramChatId } from '../payment-mode'
import {
  downloadTelegramFile,
  editTelegramStatusMessage,
  getTelegramBotToken,
  sendTelegramChatAction,
  sendTelegramStatusMessage,
} from './client'

function batchReplyKeyboard(mode: BatchKeyboardMode) {
  const keyboard = new Keyboard()
  if (mode === 'ready') {
    keyboard.text(BTN_FINALIZE_BATCH)
  }
  return keyboard.text(BTN_CANCEL_BATCH).resized()
}

function createTelegramAdapter(): MessengerAdapterWithCallbacks {
  return {
    platform: 'telegram',
    async sendText(target: MessengerReplyTarget, text: string, options?) {
      const bot = getBot()
      await bot.api.sendMessage(Number(target.chatId), text, options?.batchKeyboard
        ? { reply_markup: batchReplyKeyboard(options.batchKeyboard) }
        : undefined)
    },
    async sendStatus(target, text, options?) {
      return sendTelegramStatusMessage(Number(target.chatId), text, options)
    },
    async editStatus(target, message, text, options?) {
      await editTelegramStatusMessage(Number(target.chatId), message, text, options)
    },
    async sendTyping(target, action: TypingAction = 'typing') {
      await sendTelegramChatAction(Number(target.chatId), action)
    },
    async answerCallback(ctx: CallbackContext, text?: string) {
      const bot = getBot()
      await bot.api.answerCallbackQuery(ctx.callbackId, text ? { text } : {})
    },
  }
}

let botInstance: Bot | null = null
let botInitPromise: Promise<Bot> | null = null

export function getBot(): Bot {
  if (!botInstance) {
    botInstance = createBot()
  }
  return botInstance
}

export async function getInitializedBot(): Promise<Bot> {
  const bot = getBot()
  if (!botInitPromise) {
    botInitPromise = bot.init().then(() => bot)
  }
  return botInitPromise
}

async function handleStaffCallback(data: string, chatId: number): Promise<string> {
  const staffChatId = getStaffTelegramChatId()
  if (!staffChatId || chatId !== staffChatId) {
    throw new Error('Нет доступа')
  }

  const { handleStaffCallbackPayload } = await import('../staff-actions')
  return handleStaffCallbackPayload(data)
}

async function handleClientCallback(
  data: string,
  target: MessengerReplyTarget,
  user: { externalId: string, username?: string | null, firstName?: string | null },
  adapter: MessengerAdapterWithCallbacks,
  callbackCtx: CallbackContext,
  message?: SentMessage,
): Promise<string> {
  const orderIdFromRemove = parseBatchRemoveOrderId(data)
  if (orderIdFromRemove) {
    const { handleBatchRemoveRequest } = await import('../bot/core')
    return handleBatchRemoveRequest(target, user, orderIdFromRemove, adapter, callbackCtx, message)
  }

  const orderIdFromConfirm = parseBatchRemoveConfirmOrderId(data)
  if (orderIdFromConfirm) {
    const { handleBatchRemoveConfirm } = await import('../bot/core')
    return handleBatchRemoveConfirm(target, user, orderIdFromConfirm, adapter, callbackCtx, message)
  }

  if (data === BATCH_REMOVE_CANCEL_PREFIX || data.startsWith(BATCH_REMOVE_CANCEL_PREFIX)) {
    const orderId = parseBatchRemoveCancelOrderId(data)
    if (!orderId) {
      throw new Error('Неизвестное действие')
    }
    const { handleBatchRemoveCancel } = await import('../bot/core')
    return handleBatchRemoveCancel(target, user, orderId, adapter, callbackCtx, message)
  }

  throw new Error('Неизвестное действие')
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

function createBot(): Bot {
  const bot = new Bot(getTelegramBotToken())
  const adapter = createTelegramAdapter()

  bot.command('start', async (ctx) => {
    const telegramUser = ctx.from!
    const target: MessengerReplyTarget = {
      platform: 'telegram',
      chatId: String(telegramUser.id),
    }

    const { handleStart } = await import('../bot/core')
    await handleStart('telegram', target, ctx.match?.trim(), adapter)
  })

  bot.on('message:document', async (ctx) => {
    const document = ctx.message.document
    const telegramUser = ctx.from!
    const target: MessengerReplyTarget = {
      platform: 'telegram',
      chatId: String(telegramUser.id),
    }

    const file = await ctx.getFile()
    const { handleDocument } = await import('../bot/core')

    await handleDocument(
      'telegram',
      target,
      {
        externalId: String(telegramUser.id),
        username: telegramUser.username ?? null,
        firstName: telegramUser.first_name ?? null,
      },
      {
        fileName: document.file_name ?? 'document.pdf',
        mimeType: document.mime_type ?? '',
        download: () => downloadTelegramFile(file.file_path ?? ''),
      },
      adapter,
    )
  })

  bot.on('message:text', async (ctx) => {
    const text = ctx.message.text
    const action = isBatchActionText(text)
    if (!action) {
      return
    }

    const telegramUser = ctx.from!
    const target: MessengerReplyTarget = {
      platform: 'telegram',
      chatId: String(telegramUser.id),
    }

    const { handleBatchAction } = await import('../bot/core')
    await handleBatchAction(
      'telegram',
      target,
      {
        externalId: String(telegramUser.id),
        username: telegramUser.username ?? null,
        firstName: telegramUser.first_name ?? null,
      },
      action,
      adapter,
    )
  })

  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data
    const chatId = ctx.callbackQuery.message?.chat.id
    if (!chatId) {
      await ctx.answerCallbackQuery({ text: 'Ошибка сообщения', show_alert: true })
      return
    }

    const telegramUser = ctx.from!
    const target: MessengerReplyTarget = {
      platform: 'telegram',
      chatId: String(chatId),
    }
    const user = {
      externalId: String(telegramUser.id),
      username: telegramUser.username ?? null,
      firstName: telegramUser.first_name ?? null,
    }
    const callbackCtx: CallbackContext = {
      callbackId: ctx.callbackQuery.id,
      chatId: String(chatId),
      messageId: ctx.callbackQuery.message?.message_id
        ? String(ctx.callbackQuery.message.message_id)
        : undefined,
    }
    const message: SentMessage | undefined = callbackCtx.messageId
      ? { messageId: callbackCtx.messageId, chatId: String(chatId) }
      : undefined

    try {
      const toast = isBatchClientCallbackPayload(data)
        ? await handleClientCallback(data, target, user, adapter, callbackCtx, message)
        : await handleStaffCallback(data, chatId)
      await adapter.answerCallback?.(callbackCtx, toast)
    } catch (error) {
      let text = 'Ошибка'
      if (error && typeof error === 'object' && 'data' in error) {
        const errData = (error as { data?: { error?: string } }).data
        if (errData?.error) {
          text = errData.error
        }
      } else if (error instanceof Error) {
        text = error.message
      }
      await ctx.answerCallbackQuery({ text, show_alert: true })
    }
  })

  bot.catch((err) => {
    console.error('[telegram] bot error:', err)
  })

  return bot
}

export { InlineKeyboard }
