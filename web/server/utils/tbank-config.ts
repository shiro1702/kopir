export function isTbankConfigured(): boolean {
  const terminalKey = getTbankTerminalKey()
  const password = getTbankPassword()
  return Boolean(terminalKey && password)
}

export function getTbankApiUrl(): string {
  const fromEnv = String(process.env.TBANK_API_URL ?? '').trim()
  if (fromEnv) {
    return fromEnv
  }
  return 'https://securepay.tinkoff.ru/v2'
}

export function getTbankNotificationUrl(): string | null {
  const explicit = String(process.env.TBANK_NOTIFICATION_URL ?? '').trim()
  if (explicit) {
    return explicit
  }

  const siteUrl = String(process.env.NUXT_PUBLIC_SITE_URL ?? '').trim()
    || String(process.env.VERCEL_URL ?? '').trim()

  if (!siteUrl) {
    return null
  }

  const base = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`
  return `${base.replace(/\/$/, '')}/api/payments/webhook/tbank`
}

export function getTbankWebhookSecret(): string | null {
  const secret = String(process.env.TBANK_WEBHOOK_SECRET ?? '').trim()
  return secret || null
}

export function getTbankTerminalKey(): string | null {
  const key = String(process.env.TBANK_TERMINAL_KEY ?? '').trim()
  if (key) {
    return key
  }
  try {
    const config = useRuntimeConfig()
    const fromConfig = String(config.tbankTerminalKey ?? '').trim()
    return fromConfig || null
  } catch {
    return null
  }
}

export function getTbankPassword(): string | null {
  const password = String(process.env.TBANK_PASSWORD ?? '').trim()
  if (password) {
    return password
  }
  try {
    const config = useRuntimeConfig()
    const fromConfig = String(config.tbankPassword ?? '').trim()
    return fromConfig || null
  } catch {
    return null
  }
}
