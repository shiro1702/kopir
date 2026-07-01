import { assertAgentAuth } from '../../../utils/agent-auth'
import { runTbankPaymentWatcher } from '../../../utils/payments/tbank-payment-watcher'

export default defineEventHandler(async (event) => {
  assertAgentAuth(event)

  const body = await readBody<{ paymentId?: string }>(event)
  const paymentId = String(body?.paymentId ?? '').trim()
  if (!paymentId) {
    throw createError({
      statusCode: 400,
      data: { error: 'paymentId is required', code: 'INVALID_PAYLOAD' },
    })
  }

  const task = runTbankPaymentWatcher(paymentId)
  const waitUntil = (event as { waitUntil?: (promise: Promise<unknown>) => void }).waitUntil
    ?? (event.context as { waitUntil?: (promise: Promise<unknown>) => void }).waitUntil

  if (typeof waitUntil === 'function') {
    waitUntil(task)
  } else {
    void task
  }

  return { ok: true, watching: paymentId }
})
