export function isTbankConfigured(): boolean {
  const config = useRuntimeConfig()
  const terminalKey = String(process.env.TBANK_TERMINAL_KEY ?? '').trim()
  const password = String(process.env.TBANK_PASSWORD ?? '').trim()
  return Boolean(terminalKey && password && config)
}

export function getTbankWebhookSecret(): string | null {
  const secret = String(process.env.TBANK_WEBHOOK_SECRET ?? '').trim()
  return secret || null
}

export function getTbankTerminalKey(): string | null {
  const key = String(process.env.TBANK_TERMINAL_KEY ?? '').trim()
  return key || null
}

export function getTbankPassword(): string | null {
  const password = String(process.env.TBANK_PASSWORD ?? '').trim()
  return password || null
}
