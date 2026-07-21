import type {
  BatchKeyboardMode,
  InlineKeyboardButton,
  SentMessage,
  StatusMessageOptions,
  TypingAction,
} from '../bot/types'

export function getTelegramBotToken(): string {
  const config = useRuntimeConfig()
  const token = config.telegramBotToken
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is not configured')
  }
  return token
}

function buildInlineMarkup(buttons?: InlineKeyboardButton[][]) {
  if (!buttons?.length) {
    return undefined
  }
  return {
    inline_keyboard: buttons.map((row) =>
      row.map((btn) => {
        if (btn.webAppUrl) {
          return { text: btn.text, web_app: { url: btn.webAppUrl } }
        }
        if (btn.url) {
          return { text: btn.text, url: btn.url }
        }
        return { text: btn.text, callback_data: btn.callbackData ?? 'noop' }
      }),
    ),
  }
}

export async function sendTelegramLocationRequestKeyboard(chatId: number, text: string): Promise<SentMessage> {
  return sendTelegramMessage(chatId, text, {
    replyMarkup: {
      keyboard: [[{ text: '📍 Отправить геолокацию', request_location: true }]],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  })
}

export async function sendTelegramText(chatId: number, text: string): Promise<void> {
  await sendTelegramMessage(chatId, text)
}

export async function sendTelegramMessage(
  chatId: number,
  text: string,
  extra?: {
    replyMarkup?: object
  },
): Promise<SentMessage> {
  const token = getTelegramBotToken()
  const body: Record<string, unknown> = { chat_id: chatId, text }
  if (extra?.replyMarkup) {
    body.reply_markup = extra.replyMarkup
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errBody = await response.text()
    throw new Error(`Telegram sendMessage failed: ${response.status} ${errBody}`)
  }

  const data = await response.json() as { result?: { message_id?: number } }
  const messageId = data.result?.message_id
  if (!messageId) {
    throw new Error('Telegram sendMessage missing message_id')
  }

  return { messageId: String(messageId), chatId: String(chatId) }
}

export async function editTelegramMessage(
  chatId: number,
  messageId: string,
  text: string,
  extra?: {
    replyMarkup?: object | null
  },
): Promise<void> {
  const token = getTelegramBotToken()
  const body: Record<string, unknown> = {
    chat_id: chatId,
    message_id: Number(messageId),
    text,
  }
  if (extra && 'replyMarkup' in extra) {
    body.reply_markup = extra.replyMarkup
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errBody = await response.text()
    throw new Error(`Telegram editMessageText failed: ${response.status} ${errBody}`)
  }
}

export async function sendTelegramChatAction(
  chatId: number,
  action: TypingAction = 'typing',
): Promise<void> {
  const token = getTelegramBotToken()
  const response = await fetch(`https://api.telegram.org/bot${token}/sendChatAction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action }),
  })

  if (!response.ok) {
    const errBody = await response.text()
    throw new Error(`Telegram sendChatAction failed: ${response.status} ${errBody}`)
  }
}

export async function sendTelegramStatusMessage(
  chatId: number,
  text: string,
  options?: StatusMessageOptions,
): Promise<SentMessage> {
  const replyMarkup = options?.removeInlineKeyboard
    ? { inline_keyboard: [] }
    : buildInlineMarkup(options?.inlineKeyboard)

  return sendTelegramMessage(chatId, text, { replyMarkup })
}

export async function editTelegramStatusMessage(
  chatId: number,
  message: SentMessage,
  text: string,
  options?: StatusMessageOptions,
): Promise<void> {
  const replyMarkup = options?.removeInlineKeyboard
    ? { inline_keyboard: [] }
    : options?.inlineKeyboard
      ? buildInlineMarkup(options.inlineKeyboard)
      : undefined

  await editTelegramMessage(
    Number(message.chatId),
    message.messageId,
    text,
    { replyMarkup: replyMarkup ?? null },
  )
}

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
