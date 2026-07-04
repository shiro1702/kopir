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

function envFlag(name: string): boolean {
  const raw = String(process.env[name] ?? '').trim().toLowerCase()
  return raw === '1' || raw === 'true' || raw === 'yes'
}

function envString(name: string, fallback: string): string {
  const fromEnv = String(process.env[name] ?? '').trim()
  return fromEnv || fallback
}

/** Prod terminal with T-Checks: true. Test DEMO terminal: false. */
export function isTbankReceiptEnabled(): boolean {
  if (envFlag('TBANK_RECEIPT_ENABLED')) {
    return true
  }
  try {
    const config = useRuntimeConfig()
    return String(config.tbankReceiptEnabled ?? '').trim().toLowerCase() === 'true'
  } catch {
    return false
  }
}

export function getTbankReceiptEmail(): string | null {
  const email = envString('TBANK_RECEIPT_EMAIL', '')
  if (email) {
    return email
  }
  try {
    const config = useRuntimeConfig()
    const fromConfig = String(config.tbankReceiptEmail ?? '').trim()
    return fromConfig || null
  } catch {
    return null
  }
}

/** FFD 1.05: usn_income = УСН 6% (доходы). */
export function getTbankReceiptTaxation(): string {
  return envString('TBANK_RECEIPT_TAXATION', 'usn_income')
}

export function getTbankReceiptTax(): string {
  return envString('TBANK_RECEIPT_TAX', 'none')
}

export function getTbankReceiptPaymentObject(): string {
  return envString('TBANK_RECEIPT_PAYMENT_OBJECT', 'service')
}

export function getTbankReceiptPaymentMethod(): string {
  return envString('TBANK_RECEIPT_PAYMENT_METHOD', 'full_payment')
}

export function getTbankReceiptItemName(): string {
  return envString('TBANK_RECEIPT_ITEM_NAME', 'Услуги копировального центра')
}

export function getTbankCashboxApiUrl(): string {
  return envString('TBANK_CASHBOX_API_URL', 'https://securepay.tinkoff.ru/cashbox')
}
