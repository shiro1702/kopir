import { isTbankReceiptEnabled } from '../tbank-config'
import { tbankGetReceiptState } from './tbank-client'

const RECEIPT_URL_KEYS = [
  'Url',
  'ReceiptUrl',
  'OfdReceiptUrl',
  'FiscalUrl',
  'ReceiptUrlOfd',
  'Link',
] as const

const NESTED_RECEIPT_KEYS = ['Receipt', 'Payload', 'Data', 'Fiscalization'] as const

export function extractReceiptUrl(payload: Record<string, unknown>): string | null {
  for (const key of RECEIPT_URL_KEYS) {
    const value = payload[key]
    if (typeof value === 'string' && value.startsWith('http')) {
      return value.trim()
    }
  }

  for (const key of NESTED_RECEIPT_KEYS) {
    const nested = payload[key]
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      const url = extractReceiptUrl(nested as Record<string, unknown>)
      if (url) {
        return url
      }
    }
  }

  return null
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function resolveTbankReceiptUrl(
  externalPaymentId: string | number,
  hintUrl?: string | null,
): Promise<string | null> {
  if (!isTbankReceiptEnabled()) {
    return null
  }

  if (hintUrl?.trim()) {
    return hintUrl.trim()
  }

  const maxAttempts = Math.max(1, Number(process.env.TBANK_RECEIPT_POLL_ATTEMPTS ?? 8))
  const delayMs = Math.max(500, Number(process.env.TBANK_RECEIPT_POLL_DELAY_MS ?? 3000))

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const state = await tbankGetReceiptState(externalPaymentId)
      const url = extractReceiptUrl(state as Record<string, unknown>)
      if (url) {
        console.log('[tbank] receipt url resolved:', { externalPaymentId, attempt })
        return url
      }

      console.log('[tbank] receipt url pending:', {
        externalPaymentId,
        attempt,
        status: state.Status ?? null,
      })
    } catch (error) {
      console.error('[tbank] GetReceiptState failed:', externalPaymentId, attempt, error)
    }

    if (attempt < maxAttempts) {
      await sleep(delayMs)
    }
  }

  return null
}
