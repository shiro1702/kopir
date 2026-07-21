import { Bot, InlineKeyboard, Keyboard } from 'grammy'
import type {
  BatchKeyboardMode,
  CallbackContext,
  ClientCallbackResult,
  MessengerAdapterWithCallbacks,
  MessengerReplyTarget,
  MessengerSendTextOptions,
  SentMessage,
  StatusMessageOptions,
  TypingAction,
} from '../bot/types'
import { BTN_CANCEL_BATCH, BTN_FINALIZE_BATCH } from '../bot/messages'
import {
  BTN_CMD_FILES,
  BTN_CMD_HELP,
  BTN_CMD_POINT,
  BTN_CMD_PRINT,
  CLIENT_COMMAND_DEFINITIONS,
  isClientCommandCallback,
  parseClientCommandText,
} from '../bot/client-commands'
import {
  BTN_PARTNER_BALANCE,
  BTN_PARTNER_HELP,
  BTN_PARTNER_MENU,
  BTN_PARTNER_POINTS,
  BTN_PARTNER_REQUISITES,
  isPartnerCommandCallback,
  parsePartnerCommandText,
  PARTNER_COMMAND_DEFINITIONS,
} from '../bot/partner-commands'
import {
  isBatchClientCallbackPayload,
  isPaymentClientCallbackPayload,
  isPointClientCallbackPayload,
  isPrintRetryClientCallbackPayload,
} from '../bot/keyboards'
import { isPartnerCallbackPayload, isPartnerPrintFailureAction } from '../bot/partner-keyboards'
import { getPartnerByMessenger } from '../partner-auth'
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

function clientReplyKeyboard() {
  return new Keyboard()
    .text(BTN_CMD_PRINT)
    .text(BTN_CMD_FILES)
    .row()
    .text(BTN_CMD_POINT)
    .text(BTN_CMD_HELP)
    .resized()
    .persistent()
}

function partnerReplyKeyboard() {
  return new Keyboard()
    .text(BTN_PARTNER_MENU)
    .text(BTN_PARTNER_POINTS)
    .row()
    .text(BTN_PARTNER_BALANCE)
    .text(BTN_PARTNER_REQUISITES)
    .row()
    .text(BTN_PARTNER_HELP)
    .resized()
    .persistent()
}

function resolveTelegramReplyMarkup(options?: MessengerSendTextOptions) {
  if (options?.batchKeyboard) {
    return batchReplyKeyboard(options.batchKeyboard)
  }
  if (options?.clientMenu) {
    return clientReplyKeyboard()
  }
  if (options?.partnerMenu) {
    return partnerReplyKeyboard()
  }
  return undefined
}

export async function registerTelegramCommands(): Promise<void> {
  const bot = await getInitializedBot()
  await bot.api.setMyCommands(
    [...CLIENT_COMMAND_DEFINITIONS, ...PARTNER_COMMAND_DEFINITIONS].map((item) => ({
      command: item.command,
      description: item.description,
    })),
  )
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
      const replyMarkup = resolveTelegramReplyMarkup(options)
      await bot.api.sendMessage(Number(target.chatId), text, replyMarkup
        ? { reply_markup: replyMarkup }
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

  for (const { command } of CLIENT_COMMAND_DEFINITIONS) {
    bot.command(command, async (ctx) => {
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
      const { handleClientCommand } = await import('../bot/client-commands')
      await handleClientCommand(command, 'telegram', target, user, adapter)
    })
  }

  for (const { command } of PARTNER_COMMAND_DEFINITIONS) {
    bot.command(command, async (ctx) => {
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
      const { handlePartnerQuickCommand } = await import('../bot/partner-commands')
      await handlePartnerQuickCommand(command, 'telegram', target, user, adapter)
    })
  }

  bot.command('partner', async (ctx) => {
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
    const arg = ctx.match?.trim() || undefined

    try {
      const { handlePartnerCommand } = await import('../bot/core')
      await handlePartnerCommand('telegram', target, arg, adapter, user)
    } catch (error) {
      let text = 'Ошибка'
      if (error instanceof Error) {
        text = error.message
      }
      await ctx.reply(text)
    }
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

  bot.on('message:location', async (ctx) => {
    const location = ctx.message.location
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
    const { handlePointLocation } = await import('../bot/point-selection')
    await handlePointLocation(
      target,
      user,
      { lat: location.latitude, lng: location.longitude },
      adapter,
    )
  })

  bot.on('message:web_app_data', async (ctx) => {
    const raw = ctx.message.web_app_data?.data
    if (!raw) {
      return
    }
    let payload: { type?: string, slug?: string }
    try {
      payload = JSON.parse(raw) as { type?: string, slug?: string }
    } catch {
      await ctx.reply('Не удалось обработать выбор точки')
      return
    }
    if (payload.type !== 'point_selected' || !payload.slug) {
      await ctx.reply('Не удалось обработать выбор точки')
      return
    }
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
    const { handleWebAppPointSelect } = await import('../bot/point-selection')
    const toast = await handleWebAppPointSelect(target, user, payload.slug, adapter)
    if (toast) {
      await ctx.reply(toast)
    }
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

    const clientCommand = parseClientCommandText(text)
    if (clientCommand) {
      const { handleClientCommand } = await import('../bot/client-commands')
      await handleClientCommand(clientCommand, 'telegram', target, user, adapter)
      return
    }

    const partnerCommand = parsePartnerCommandText(text)
    if (partnerCommand) {
      const { handlePartnerQuickCommand } = await import('../bot/partner-commands')
      await handlePartnerQuickCommand(partnerCommand, 'telegram', target, user, adapter)
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

    const partner = await getPartnerByMessenger('telegram', BigInt(user.externalId))
    if (partner) {
      const { handleUnknownPartnerText } = await import('../bot/partner-commands')
      await handleUnknownPartnerText(target, adapter)
      return
    }

    const { handleUnknownClientText } = await import('../bot/client-commands')
    await handleUnknownClientText(target, adapter)
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
      const isPartnerCallback = isPartnerCallbackPayload(data)
      const isStaffCallback = !isPartnerCallback
        && !isClientCommandCallback(data)
        && !isPartnerCommandCallback(data)
        && !isBatchClientCallbackPayload(data)
        && !isPaymentClientCallbackPayload(data)
        && !isPrintRetryClientCallbackPayload(data)
        && !isPointClientCallbackPayload(data)

      let result: { toast?: string, callbackAnswer?: import('../bot/types').CallbackAnswerOptions }
      if (isPartnerCallback) {
        const { assertPartnerForPayload, handlePartnerCallbackPayload } = await import('../partner-actions')
        await assertPartnerForPayload('telegram', chatId, data)
        const screen = await handlePartnerCallbackPayload('telegram', BigInt(telegramUser.id), data)
        const isPartnerFailureAction = isPartnerPrintFailureAction(data)
        const isPartnerToastOnlyAction = data.startsWith('partner_retry_print:')
          || data.startsWith('partner_manual_print:')
        if (message && callbackCtx.messageId && !isPartnerFailureAction) {
          const { editTelegramStatusMessage } = await import('./client')
          await editTelegramStatusMessage(chatId, message, screen.text, {
            inlineKeyboard: screen.keyboard,
          })
        } else if (!isPartnerToastOnlyAction) {
          await adapter.sendText(target, screen.text, { inlineKeyboard: screen.keyboard })
        }
        result = {
          toast: isPartnerToastOnlyAction || data.startsWith('partner_refund_confirm:') ? screen.text : 'Готово',
        }
      } else if (isStaffCallback) {
        result = { toast: await handleStaffCallback(data, chatId) }
      } else {
        result = await handleClientCallback(data, target, user, adapter, callbackCtx, message)
      }
      const { isStaffPaymentConfirmPayload } = await import('../staff-actions')
      await adapter.answerCallback?.(callbackCtx, result.toast, {
        showAlert: (isStaffCallback && isStaffPaymentConfirmPayload(data))
          || data.startsWith('partner_refund_confirm:'),
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
