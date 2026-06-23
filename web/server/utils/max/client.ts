const MAX_API_BASE = 'https://platform-api.max.ru'

import type { BatchKeyboardMode, InlineKeyboardButton, SentMessage, StatusMessageOptions } from '../bot/types'

const MAX_UPDATE_TYPES = [
  'message_created',
  'message_callback',
  'bot_started',
] as const

export function getMaxBotToken(): string {
  const config = useRuntimeConfig()
  const token = config.maxBotToken
  if (!token) {
    throw new Error('MAX_BOT_TOKEN is not configured')
  }
  return token
}

export class MaxClient {
  constructor(private readonly token: string) {}

  private async request<T>(
    method: string,
    path: string,
    options?: { query?: Record<string, string>, body?: unknown },
  ): Promise<T> {
    const url = new URL(`${MAX_API_BASE}${path}`)
    if (options?.query) {
      for (const [key, value] of Object.entries(options.query)) {
        url.searchParams.set(key, value)
      }
    }

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: this.token,
        ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`MAX API ${method} ${path} failed: ${response.status} ${body}`)
    }

    if (response.status === 204) {
      return undefined as T
    }

    return response.json() as Promise<T>
  }

  async setWebhook(url: string, secret?: string): Promise<void> {
    const body: Record<string, unknown> = {
      url,
      update_types: [...MAX_UPDATE_TYPES],
    }
    if (secret) {
      body.secret = secret
    }
    await this.request('POST', '/subscriptions', { body })
  }

  async sendMessage(
    target: { chatId?: number, userId?: number },
    text: string,
    attachments?: unknown[],
  ): Promise<SentMessage> {
    const query: Record<string, string> = {}
    if (target.chatId !== undefined) {
      query.chat_id = String(target.chatId)
    } else if (target.userId !== undefined) {
      query.user_id = String(target.userId)
    } else {
      throw new Error('MAX sendMessage requires chatId or userId')
    }

    const body: Record<string, unknown> = { text }
    if (attachments?.length) {
      body.attachments = attachments
    }

    const data = await this.request<{ message?: { body?: { mid?: string } } }>('POST', '/messages', {
      query,
      body,
    })

    const messageId = data.message?.body?.mid
    if (!messageId) {
      throw new Error('MAX sendMessage missing message id')
    }

    const chatId = target.chatId !== undefined
      ? String(target.chatId)
      : String(target.userId)

    return { messageId, chatId }
  }

  async editMessage(
    messageId: string,
    text: string,
    attachments?: unknown[] | null,
  ): Promise<void> {
    const body: Record<string, unknown> = { text }
    if (attachments !== undefined) {
      body.attachments = attachments
    }

    await this.request('PUT', '/messages', {
      query: { message_id: messageId },
      body,
    })
  }

  async answerCallback(callbackId: string, notification: string): Promise<void> {
    await this.request('POST', '/answers', {
      query: { callback_id: callbackId },
      body: { notification },
    })
  }

  async downloadFile(url: string): Promise<Buffer> {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to download MAX file: ${response.status}`)
    }
    return Buffer.from(await response.arrayBuffer())
  }

  async getMessageById(messageId: string): Promise<import('./types').MaxMessage> {
    const data = await this.request<{ messages?: import('./types').MaxMessage[] }>(
      'GET',
      '/messages',
      { query: { message_ids: messageId } },
    )
    const message = data.messages?.[0]
    if (!message) {
      throw new Error(`MAX message not found: ${messageId}`)
    }
    return message
  }

  /** Upload binary to MAX and return token for file attachment in messages. */
  async uploadFile(buffer: Buffer, fileName: string): Promise<string> {
    const meta = await this.request<{ url: string }>('POST', '/uploads', {
      query: { type: 'file' },
    })

    const form = new FormData()
    form.append('data', new Blob([buffer]), fileName)

    const uploadResponse = await fetch(meta.url, { method: 'POST', body: form })
    if (!uploadResponse.ok) {
      const body = await uploadResponse.text()
      throw new Error(`MAX file upload failed: ${uploadResponse.status} ${body}`)
    }

    const uploaded = await uploadResponse.json() as { token?: string, payload?: { token?: string } }
    const token = uploaded.token ?? uploaded.payload?.token
    if (!token) {
      throw new Error('MAX file upload response missing token')
    }
    return token
  }

  async sendFileMessage(
    target: { chatId?: number, userId?: number },
    text: string,
    fileName: string,
    data: Buffer,
    extraAttachments?: unknown[],
  ): Promise<void> {
    const token = await this.uploadFile(data, fileName)
    const fileAttachment = { type: 'file', payload: { token } }
    const attachments = [fileAttachment, ...(extraAttachments ?? [])]
    await this.sendMessage(target, text, attachments)
  }
}

function maxInlineFromButtons(buttons: InlineKeyboardButton[][]) {
  return [{
    type: 'inline_keyboard',
    payload: {
      buttons: buttons.map((row) =>
        row.map((btn) => ({
          type: 'callback',
          text: btn.text,
          payload: btn.callbackData,
          intent: 'default',
        })),
      ),
    },
  }]
}

export async function sendMaxStatusMessage(
  chatId: number,
  text: string,
  options?: StatusMessageOptions,
): Promise<SentMessage> {
  const attachments = options?.removeInlineKeyboard
    ? []
    : options?.inlineKeyboard
      ? maxInlineFromButtons(options.inlineKeyboard)
      : undefined

  return getMaxClient().sendMessage({ chatId }, text, attachments)
}

export async function editMaxStatusMessage(
  message: SentMessage,
  text: string,
  options?: StatusMessageOptions,
): Promise<void> {
  const attachments = options?.removeInlineKeyboard
    ? []
    : options?.inlineKeyboard
      ? maxInlineFromButtons(options.inlineKeyboard)
      : options === undefined
        ? undefined
        : null

  await getMaxClient().editMessage(message.messageId, text, attachments)
}

export async function sendMaxBatchMessage(
  userId: number,
  text: string,
  mode: BatchKeyboardMode,
): Promise<void> {
  const { BTN_CANCEL_BATCH, BTN_FINALIZE_BATCH } = await import('../bot/messages')
  const buttons = mode === 'ready'
    ? [
        { type: 'callback', text: BTN_FINALIZE_BATCH, payload: 'batch_finalize', intent: 'default' },
        { type: 'callback', text: BTN_CANCEL_BATCH, payload: 'batch_cancel', intent: 'default' },
      ]
    : [
        { type: 'callback', text: BTN_CANCEL_BATCH, payload: 'batch_cancel', intent: 'default' },
      ]

  await getMaxClient().sendMessage(
    { userId },
    text,
    [{ type: 'inline_keyboard', payload: { buttons: [buttons] } }],
  )
}

let maxClientInstance: MaxClient | null = null

export function getMaxClient(): MaxClient {
  if (!maxClientInstance) {
    maxClientInstance = new MaxClient(getMaxBotToken())
  }
  return maxClientInstance
}
