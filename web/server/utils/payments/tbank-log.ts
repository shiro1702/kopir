const SENSITIVE_KEYS = new Set(['Token', 'Password', 'DATA', 'Receipt', 'Items', 'Shops'])

interface TbankLogResponse {
  ErrorCode?: string
  PaymentId?: string | number
  OrderId?: string
  Status?: string
  Amount?: number
  PaymentURL?: string
  Data?: string
  Message?: string
  Details?: string
}

export function maskTerminalKey(key: string): string {
  const trimmed = key.trim()
  if (!trimmed) {
    return '(empty)'
  }
  if (trimmed.length <= 8) {
    return '***'
  }
  return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`
}

export function isDemoTerminalKey(key: string): boolean {
  return key.trim().toUpperCase().endsWith('DEMO')
}

export function sanitizeTbankParams(params: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(params)) {
    if (SENSITIVE_KEYS.has(key)) {
      continue
    }
    if (key === 'TerminalKey' && typeof value === 'string') {
      out.TerminalKey = maskTerminalKey(value)
      out.terminalDemo = isDemoTerminalKey(value)
      continue
    }
    out[key] = value
  }
  return out
}

export function logTbankConfigHint(terminalKey: string | null, passwordConfigured: boolean): void {
  console.log('[tbank] config', {
    terminalKey: terminalKey ? maskTerminalKey(terminalKey) : '(missing)',
    terminalDemo: terminalKey ? isDemoTerminalKey(terminalKey) : null,
    passwordConfigured,
  })
}

export function logTbankRequest(
  method: string,
  params: Record<string, unknown>,
  meta?: { url?: string },
): void {
  console.log('[tbank] request', {
    method,
    url: meta?.url,
    params: sanitizeTbankParams(params),
  })
}

export function logTbankSuccess(method: string, data: TbankLogResponse): void {
  console.log('[tbank] ok', {
    method,
    errorCode: data.ErrorCode,
    paymentId: data.PaymentId,
    orderId: data.OrderId,
    status: data.Status,
    amount: data.Amount,
    hasPaymentUrl: Boolean(data.PaymentURL),
    hasQrData: Boolean(data.Data),
  })
}

export function logTbankFailure(
  method: string,
  data: Partial<TbankLogResponse>,
  httpStatus: number,
): void {
  console.error('[tbank] api error', {
    method,
    httpStatus,
    errorCode: data.ErrorCode ?? null,
    message: data.Message ?? null,
    details: data.Details ?? null,
    status: data.Status ?? null,
    orderId: data.OrderId ?? null,
    paymentId: data.PaymentId ?? null,
  })
}

export function logTbankNetworkError(method: string, error: unknown): void {
  console.error('[tbank] network error', { method, error })
}

export function logTbankInvalidResponse(method: string, httpStatus: number): void {
  console.error('[tbank] invalid response', { method, httpStatus })
}

export function logTbankWebhookReceived(payload: Record<string, unknown>): void {
  console.log('[tbank] webhook POST received', {
    orderId: payload.OrderId ?? null,
    paymentId: payload.PaymentId ?? null,
    status: payload.Status ?? null,
    success: payload.Success ?? null,
    hasToken: typeof payload.Token === 'string' && payload.Token.length > 0,
  })
}

export function logTbankWebhookProcessed(
  outcome: 'confirmed' | 'ignored' | 'error',
  meta: Record<string, unknown>,
): void {
  const line = outcome === 'error' ? console.error : console.log
  line('[tbank] webhook processed', { outcome, ...meta })
}
