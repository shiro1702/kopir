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

export async function downloadTelegramFile(filePath: string): Promise<Buffer> {
  const token = getTelegramBotToken()
  const fileUrl = `https://api.telegram.org/file/bot${token}/${filePath}`
  const response = await fetch(fileUrl)
  if (!response.ok) {
    throw new Error(`Failed to download file from Telegram: ${response.status}`)
  }
  return Buffer.from(await response.arrayBuffer())
}
