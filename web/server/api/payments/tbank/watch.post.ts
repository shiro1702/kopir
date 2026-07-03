import { assertAgentAuth } from '../../../utils/agent-auth'
import { runTbankPaymentWatcherBatch } from '../../../utils/payments/tbank-payment-watcher'

export default defineEventHandler(async (event) => {
  assertAgentAuth(event)

  const body = await readBody<{ paymentId?: string, startedAt?: number }>(event)
  const paymentId = String(body?.paymentId ?? '').trim()
  if (!paymentId) {
    throw createError({
      statusCode: 400,
      data: { error: 'paymentId is required', code: 'INVALID_PAYLOAD' },
    })
  }

  const startedAt = typeof body?.startedAt === 'number' ? body.startedAt : Date.now()
  if (body?.startedAt === undefined) {
    console.log('[tbank] watching payment:', paymentId)
  }

  const status = await runTbankPaymentWatcherBatch(paymentId, startedAt)
  return { ok: true, status }
})
