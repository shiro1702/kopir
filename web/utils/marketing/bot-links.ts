const CLIENT_START_PAYLOAD = 'print'
const PARTNER_START_PAYLOAD = 'partner'

export function buildTelegramBotUrl(username: string, payload?: string): string | null {
  const normalized = username.replace(/^@/, '').trim()
  if (!normalized) {
    return null
  }
  if (!payload) {
    return `https://t.me/${normalized}`
  }
  return `https://t.me/${normalized}?start=${encodeURIComponent(payload)}`
}

export function buildMaxBotUrl(maxBotLink: string, payload?: string): string | null {
  const base = maxBotLink.replace(/\/$/, '').trim()
  if (!base) {
    return null
  }
  if (!payload) {
    return base
  }
  return `${base}?start=${encodeURIComponent(payload)}`
}

export { CLIENT_START_PAYLOAD, PARTNER_START_PAYLOAD }
