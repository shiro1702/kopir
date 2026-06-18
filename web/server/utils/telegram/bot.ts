import { Bot, Keyboard } from 'grammy'
import type { MessengerAdapter, MessengerReplyTarget } from '../bot/types'
import { BTN_CANCEL_BATCH, BTN_FINALIZE_BATCH } from '../bot/messages'
import { getStaffTelegramChatId } from '../payment-mode'
import { downloadTelegramFile, getTelegramBotToken } from './client'

function batchReplyKeyboard() {
  return new Keyboard()
    .text(BTN_FINALIZE_BATCH)
    .text(BTN_CANCEL_BATCH)
    .resized()
}

function createTelegramAdapter(): MessengerAdapter {
  return {
    platform: 'telegram',
    async sendText(target: MessengerReplyTarget, text: string, options?) {
      const bot = getBot()
      await bot.api.sendMessage(Number(target.chatId), text, options?.showBatchActions
        ? { reply_markup: batchReplyKeyboard() }
        : undefined)
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

  bot.on('callback_query:data', async (ctx) => {
    const chatId = ctx.callbackQuery.message?.chat.id
    if (!chatId) {
      await ctx.answerCallbackQuery({ text: 'Ошибка сообщения', show_alert: true })
      return
    }

    try {
      const message = await handleStaffCallback(ctx.callbackQuery.data, chatId)
      await ctx.answerCallbackQuery({ text: message })
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
      await ctx.answerCallbackQuery({ text, show_alert: true })
    }
  })

  bot.catch((err) => {
    console.error('[telegram] bot error:', err)
  })

  return bot
}
