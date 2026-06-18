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

export interface MessengerAdapter {
  platform: MessengerPlatform
  sendText(
    target: MessengerReplyTarget,
    text: string,
    options?: { showBatchActions?: boolean },
  ): Promise<void>
}
