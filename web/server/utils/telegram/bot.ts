import { Bot } from 'grammy'
import { handleDocument, handleStart } from '../bot/core'
import type { MessengerAdapter, MessengerReplyTarget } from '../bot/types'
import { handleStaffCallbackPayload } from '../staff-actions'
import { getStaffTelegramChatId } from '../payment-mode'
import { downloadTelegramFile, getTelegramBotToken } from './client'

function createTelegramAdapter(): MessengerAdapter {
  return {
    platform: 'telegram',
    async sendText(target: MessengerReplyTarget, text: string) {
      const bot = getBot()
      await bot.api.sendMessage(Number(target.chatId), text)
    },
  }
}

let botInstance: Bot | null = null

export function getBot(): Bot {
  if (!botInstance) {
    botInstance = createBot()
  }
  return botInstance
}

async function handleStaffCallback(data: string, chatId: number): Promise<string> {
  const staffChatId = getStaffTelegramChatId()
  if (!staffChatId || chatId !== staffChatId) {
    throw new Error('Нет доступа')
  }

  return handleStaffCallbackPayload(data)
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
