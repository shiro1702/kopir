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

export interface IncomingPdf {
  fileName: string
  mimeType?: string
  download: () => Promise<Buffer>
}

export interface MessengerAdapter {
  platform: MessengerPlatform
  sendText(target: MessengerReplyTarget, text: string): Promise<void>
}
