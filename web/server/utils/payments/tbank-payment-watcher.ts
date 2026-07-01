import { reconcileTbankPayment } from './providers/tbank-acquiring'
import { getPublicSiteUrl } from '../site-url'

const POLL_INTERVAL_MS = Math.max(
  1000,
  Number(process.env.TBANK_PAYMENT_POLL_INTERVAL_MS ?? 3000),
)
const POLL_MAX_MS = Math.max(
  POLL_INTERVAL_MS,
  Number(process.env.TBANK_PAYMENT_POLL_MAX_MS ?? 20 * 60 * 1000),
)

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export type TbankWatchStepResult = 'confirmed' | 'pending' | 'timeout'

/** Single GetState poll; safe inside one Vercel invocation (~few seconds). */
export async function runTbankPaymentWatcherStep(
  paymentId: string,
  startedAt: number,
): Promise<TbankWatchStepResult> {
  if (Date.now() - startedAt >= POLL_MAX_MS) {
    console.log('[tbank] poll timeout:', paymentId)
    return 'timeout'
  }

  try {
    const result = await reconcileTbankPayment(paymentId)
    if (result.status === 'confirmed') {
      console.log('[tbank] payment settled:', paymentId, {
        alreadyConfirmed: result.alreadyConfirmed,
        entityId: result.entityId,
      })
      return 'confirmed'
    }
    console.log('[tbank] poll pending:', paymentId, {
      bankStatus: result.bankStatus ?? null,
    })
  } catch (error) {
    console.error('[tbank] poll error:', paymentId, error)
  }

  return 'pending'
}

async function postWatchRequest(paymentId: string, startedAt: number): Promise<boolean> {
  const baseUrl = getPublicSiteUrl()
  const apiKey = String(process.env.AGENT_API_KEY ?? '').trim()
  if (!baseUrl || !apiKey) {
    console.warn('[tbank] remote watch skipped: missing site URL or AGENT_API_KEY')
    return false
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/payments/tbank/watch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ paymentId, startedAt }),
  })

  if (!response.ok) {
    console.error('[tbank] watch request failed:', paymentId, response.status)
    return false
  }

  return true
}

/** Next poll via new serverless invocation (Vercel kills long loops after HTTP response). */
export async function scheduleChainedTbankWatch(
  paymentId: string,
  startedAt: number,
): Promise<void> {
  await sleep(POLL_INTERVAL_MS)
  await postWatchRequest(paymentId, startedAt)
}

async function runTbankPaymentWatcherLocal(paymentId: string): Promise<void> {
  const startedAt = Date.now()
  console.log('[tbank] watching payment:', paymentId)

  while (Date.now() - startedAt < POLL_MAX_MS) {
    const status = await runTbankPaymentWatcherStep(paymentId, startedAt)
    if (status !== 'pending') {
      return
    }
    await sleep(POLL_INTERVAL_MS)
  }

  console.log('[tbank] poll timeout:', paymentId)
}

function triggerRemoteWatch(paymentId: string): void {
  const startedAt = Date.now()
  void postWatchRequest(paymentId, startedAt).catch((error) => {
    console.error('[tbank] failed to schedule remote watch:', paymentId, error)
    void runTbankPaymentWatcherLocal(paymentId)
  })
}

/** Poll GetState until paid; webhook fallback for dev and delayed bank notifications. */
export function scheduleTbankPaymentWatcher(paymentId: string): void {
  if (process.env.VERCEL_URL) {
    triggerRemoteWatch(paymentId)
    return
  }
  void runTbankPaymentWatcherLocal(paymentId)
}
