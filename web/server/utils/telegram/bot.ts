import { Bot, InlineKeyboard, Keyboard } from 'grammy'
import type {
  BatchKeyboardMode,
  CallbackContext,
  ClientCallbackResult,
  MessengerAdapterWithCallbacks,
  MessengerReplyTarget,
  SentMessage,
  StatusMessageOptions,
  TypingAction,
} from '../bot/types'
import { BTN_CANCEL_BATCH, BTN_FINALIZE_BATCH } from '../bot/messages'
import {
  isBatchClientCallbackPayload,
  isPaymentClientCallbackPayload,
  isPointClientCallbackPayload,
  isPrintRetryClientCallbackPayload,
} from '../bot/keyboards'
import { routeClientCallback } from '../bot/client-callbacks'
import { assertStaffForPayload } from '../staff-auth'
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
      if (options?.inlineKeyboard) {
        await sendTelegramStatusMessage(Number(target.chatId), text, {
          inlineKeyboard: options.inlineKeyboard,
        })
        return
      }
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
    async answerCallback(ctx: CallbackContext, text?: string, options?) {
      const bot = getBot()
      await bot.api.answerCallbackQuery(ctx.callbackId, {
        text: text ?? options?.text ?? '',
        show_alert: options?.showAlert ?? false,
        url: options?.url,
      })
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
  await assertStaffForPayload('telegram', chatId, data)

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
): Promise<ClientCallbackResult> {
  return routeClientCallback(data, target, user, adapter, callbackCtx, message)
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
    const chatId = ctx.chat.id
    const target: MessengerReplyTarget = {
      platform: 'telegram',
      chatId: String(chatId),
    }

    const user = {
      externalId: String(telegramUser.id),
      username: telegramUser.username ?? null,
      firstName: telegramUser.first_name ?? null,
    }

    const { handleStart } = await import('../bot/core')
    await handleStart('telegram', target, ctx.match?.trim(), adapter, user)
  })

  bot.command('bind', async (ctx) => {
    const chatId = ctx.chat.id
    const target: MessengerReplyTarget = {
      platform: 'telegram',
      chatId: String(chatId),
    }
    const token = ctx.match?.trim()
    if (!token) {
      await ctx.reply('Использование: /bind <токен>')
      return
    }

    try {
      const { handleBind } = await import('../bot/core')
      await handleBind('telegram', target, token, adapter)
    } catch (error) {
      let text = 'Не удалось привязать канал'
      if (error && typeof error === 'object' && 'data' in error) {
        const errData = (error as { data?: { error?: string } }).data
        if (errData?.error) {
          text = errData.error
        }
      } else if (error instanceof Error) {
        text = error.message
      }
      await ctx.reply(text)
    }
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
    const telegramUser = ctx.from!
    const target: MessengerReplyTarget = {
      platform: 'telegram',
      chatId: String(telegramUser.id),
    }
    const user = {
      externalId: String(telegramUser.id),
      username: telegramUser.username ?? null,
      firstName: telegramUser.first_name ?? null,
    }

    const action = isBatchActionText(text)
    if (action) {
      const { handleBatchAction } = await import('../bot/core')
      await handleBatchAction('telegram', target, user, action, adapter)
      return
    }

    const trimmed = text.trim()
    if (/^\d{2,4}$/.test(trimmed)) {
      const { handleDisplayCodeMessage } = await import('../bot/point-selection')
      const handled = await handleDisplayCodeMessage(target, user, trimmed, adapter)
      if (handled) {
        return
      }
    }
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
      const isStaffCallback = !isBatchClientCallbackPayload(data)
        && !isPaymentClientCallbackPayload(data)
        && !isPrintRetryClientCallbackPayload(data)
        && !isPointClientCallbackPayload(data)
      const result = isStaffCallback
        ? { toast: await handleStaffCallback(data, chatId) }
        : await handleClientCallback(data, target, user, adapter, callbackCtx, message)
      const { isStaffPaymentConfirmPayload } = await import('../staff-actions')
      await adapter.answerCallback?.(callbackCtx, result.toast, {
        showAlert: isStaffCallback && isStaffPaymentConfirmPayload(data),
        url: result.callbackAnswer?.url,
        ...result.callbackAnswer,
      })
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
