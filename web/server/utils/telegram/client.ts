export function getTelegramBotToken(): string {
  const config = useRuntimeConfig()
  const token = config.telegramBotToken
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is not configured')
  }
  return token
}

export async function sendTelegramText(chatId: number, text: string): Promise<void> {
  const token = getTelegramBotToken()
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Telegram sendMessage failed: ${response.status} ${body}`)
  }
}

import type { BatchKeyboardMode } from '../bot/types'

export async function sendTelegramBatchMessage(
  chatId: number,
  text: string,
  mode: BatchKeyboardMode,
): Promise<void> {
  const { getInitializedBot } = await import('./bot')
  const bot = await getInitializedBot()
  const { BTN_CANCEL_BATCH, BTN_FINALIZE_BATCH } = await import('../bot/messages')
  const { Keyboard } = await import('grammy')

  const keyboard = new Keyboard()
  if (mode === 'ready') {
    keyboard.text(BTN_FINALIZE_BATCH)
  }
  keyboard.text(BTN_CANCEL_BATCH).resized()

  await bot.api.sendMessage(chatId, text, { reply_markup: keyboard })
}

export async function downloadTelegramFile(filePath: string): Promise<Buffer> {
  const token = getTelegramBotToken()
  const fileUrl = `https://api.telegram.org/file/bot${token}/${filePath}`
  const response = await fetch(fileUrl)
  if (!response.ok) {
    throw new Error(`Failed to download file from Telegram: ${response.status}`)
  }
  return Buffer.from(await response.arrayBuffer())
}
