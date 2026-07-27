import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

/** Payload from Telegram Login Widget / callback. */
export type TelegramLoginPayload = {
  id: number | string
  first_name?: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number | string
  hash: string
}

const AUTH_MAX_AGE_SEC = 24 * 60 * 60

function buildCheckString(data: TelegramLoginPayload): string {
  const entries: Array<[string, string]> = []
  for (const [key, value] of Object.entries(data)) {
    if (key === 'hash' || value === undefined || value === null || value === '') {
      continue
    }
    entries.push([key, String(value)])
  }
  entries.sort(([a], [b]) => a.localeCompare(b))
  return entries.map(([key, value]) => `${key}=${value}`).join('\n')
}

/**
 * Verifies Telegram Login Widget data per
 * https://core.telegram.org/widgets/login#checking-authorization
 */
export function verifyTelegramLogin(
  data: TelegramLoginPayload,
  botToken: string,
  maxAgeSec = AUTH_MAX_AGE_SEC,
  nowSec = Math.floor(Date.now() / 1000),
): boolean {
  if (!botToken || !data?.hash) {
    return false
  }

  const authDate = Number(data.auth_date)
  if (!Number.isFinite(authDate) || authDate <= 0) {
    return false
  }
  if (nowSec - authDate > maxAgeSec) {
    return false
  }

  const checkString = buildCheckString(data)
  const secretKey = createHash('sha256').update(botToken).digest()
  const computed = createHmac('sha256', secretKey).update(checkString).digest('hex')

  try {
    const a = Buffer.from(computed, 'utf8')
    const b = Buffer.from(String(data.hash), 'utf8')
    if (a.length !== b.length) {
      return false
    }
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export function parseTelegramUserId(raw: number | string): bigint | null {
  const text = String(raw ?? '').trim()
  if (!/^\d+$/.test(text)) {
    return null
  }
  try {
    return BigInt(text)
  } catch {
    return null
  }
}

export function displayNameFromTelegramLogin(data: TelegramLoginPayload): string | null {
  const first = String(data.first_name ?? '').trim()
  const last = String(data.last_name ?? '').trim()
  const full = [first, last].filter(Boolean).join(' ').trim()
  if (full) {
    return full
  }
  const username = String(data.username ?? '').trim()
  return username || null
}
