export type MessengerPlatform = 'telegram' | 'max'

export interface BotUser {
  externalId: string
  username?: string | null
  firstName?: string | null
}

export interface MessengerReplyTarget {
  platform: MessengerPlatform
  chatId: string
}

export interface IncomingDocument {
  fileName: string
  mimeType?: string
  download: () => Promise<Buffer>
}

/** @deprecated Use IncomingDocument */
export type IncomingPdf = IncomingDocument

export type BatchKeyboardMode = 'calculating' | 'ready' | 'needs_point'

export type TypingAction = 'typing' | 'upload_document'

export interface InlineKeyboardButton {
  text: string
  callbackData?: string
  url?: string
}

export interface SentMessage {
  messageId: string
  chatId: string
}

export interface StatusMessageOptions {
  batchKeyboard?: BatchKeyboardMode
  inlineKeyboard?: InlineKeyboardButton[][]
  removeInlineKeyboard?: boolean
}

export interface MessengerAdapter {
  platform: MessengerPlatform
  sendText(
    target: MessengerReplyTarget,
    text: string,
    options?: { batchKeyboard?: BatchKeyboardMode, inlineKeyboard?: InlineKeyboardButton[][] },
  ): Promise<void>
  sendStatus?(
    target: MessengerReplyTarget,
    text: string,
    options?: StatusMessageOptions,
  ): Promise<SentMessage>
  editStatus?(
    target: MessengerReplyTarget,
    message: SentMessage,
    text: string,
    options?: StatusMessageOptions,
  ): Promise<void>
  sendTyping?(target: MessengerReplyTarget, action?: TypingAction): Promise<void>
}

export interface CallbackContext {
  callbackId: string
  messageId?: string
  chatId?: string
}

export interface CallbackAnswerOptions {
  showAlert?: boolean
  text?: string
  /** Telegram: open payment URL in client when answering callback */
  url?: string
}

export interface ClientCallbackResult {
  toast?: string
  callbackAnswer?: CallbackAnswerOptions & { text?: string }
}

export interface MessengerAdapterWithCallbacks extends MessengerAdapter {
  answerCallback?(ctx: CallbackContext, text?: string, options?: CallbackAnswerOptions): Promise<void>
}
