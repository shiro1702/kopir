/** Safe fields for Vercel Runtime Logs (no Token / secrets). */
export function tbankWebhookPayloadMeta(payload: Record<string, unknown>) {
  return {
    OrderId: payload.OrderId ?? null,
    PaymentId: payload.PaymentId ?? null,
    Status: payload.Status ?? null,
    Success: payload.Success ?? null,
    ErrorCode: payload.ErrorCode ?? null,
    Amount: payload.Amount ?? null,
    TerminalKey: payload.TerminalKey ?? null,
    hasToken: typeof payload.Token === 'string' && payload.Token.length > 0,
  }
}

export function logTbankInit(data: {
  merchantOrderId: string
  amountKopeks: number
  notificationUrl: string | null
  paymentId?: string | number | null
}) {
  console.log('[tbank] Init', data)
}

export function logTbankWebhookReceived(
  payload: Record<string, unknown>,
  extra?: Record<string, unknown>,
) {
  console.log('[tbank] webhook POST received', {
    ...tbankWebhookPayloadMeta(payload),
    ...extra,
  })
}

export function logTbankWebhookProcessed(result: unknown) {
  console.log('[tbank] webhook processed', result)
}

export function logTbankWebhookError(error: unknown, context?: Record<string, unknown>) {
  console.error('[tbank] webhook error', error, context ?? {})
}

export function scheduleBackgroundTask(
  event: { waitUntil?: (promise: Promise<unknown>) => void, context?: { waitUntil?: (promise: Promise<unknown>) => void } },
  task: Promise<unknown>,
): void {
  const waitUntil = event.waitUntil ?? event.context?.waitUntil
  if (typeof waitUntil === 'function') {
    waitUntil(task)
    return
  }
  void task
}
