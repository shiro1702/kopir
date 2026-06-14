import { Bot } from 'grammy'
import { handleDocument, handleStart } from '../bot/core'
import type { MessengerAdapter, MessengerReplyTarget } from '../bot/types'
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
        download: () => downloadTelegramFile(file.file_path),
      },
      adapter,
    )
  })

  bot.catch((err) => {
    console.error('[telegram] bot error:', err)
  })

  return bot
}
