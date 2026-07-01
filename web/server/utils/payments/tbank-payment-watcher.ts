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

export async function runTbankPaymentWatcher(paymentId: string): Promise<void> {
  const started = Date.now()
  console.log('[tbank] watching payment:', paymentId)

  while (Date.now() - started < POLL_MAX_MS) {
    try {
      const result = await reconcileTbankPayment(paymentId)
      if (result.status === 'confirmed') {
        console.log('[tbank] payment settled:', paymentId, {
          alreadyConfirmed: result.alreadyConfirmed,
          entityId: result.entityId,
        })
        return
      }
    } catch (error) {
      console.error('[tbank] poll error:', paymentId, error)
    }

    await sleep(POLL_INTERVAL_MS)
  }

  console.log('[tbank] poll timeout:', paymentId)
}

function triggerRemoteWatch(paymentId: string): void {
  const baseUrl = getPublicSiteUrl()
  const apiKey = String(process.env.AGENT_API_KEY ?? '').trim()
  if (!baseUrl || !apiKey) {
    console.warn('[tbank] remote watch skipped: missing site URL or AGENT_API_KEY')
    void runTbankPaymentWatcher(paymentId)
    return
  }

  fetch(`${baseUrl.replace(/\/$/, '')}/api/payments/tbank/watch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ paymentId }),
  }).catch((error) => {
    console.error('[tbank] failed to schedule remote watch:', paymentId, error)
    void runTbankPaymentWatcher(paymentId)
  })
}

/** Poll GetState until paid; webhook fallback for dev and delayed bank notifications. */
export function scheduleTbankPaymentWatcher(paymentId: string): void {
  if (process.env.VERCEL_URL) {
    triggerRemoteWatch(paymentId)
    return
  }
  void runTbankPaymentWatcher(paymentId)
}
