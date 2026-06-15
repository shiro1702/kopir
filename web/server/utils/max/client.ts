const MAX_API_BASE = 'https://platform-api.max.ru'

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
  ): Promise<void> {
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

    await this.request('POST', '/messages', {
      query,
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
}

let maxClientInstance: MaxClient | null = null

export function getMaxClient(): MaxClient {
  if (!maxClientInstance) {
    maxClientInstance = new MaxClient(getMaxBotToken())
  }
  return maxClientInstance
}
