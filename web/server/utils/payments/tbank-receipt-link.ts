import { isTbankReceiptEnabled } from '../tbank-config'

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

/** Receipt OFD link from T-Bank webhook payload only (no API polling). */
export function resolveTbankReceiptUrl(
  webhookPayload?: Record<string, unknown> | null,
): string | null {
  if (!isTbankReceiptEnabled() || !webhookPayload) {
    return null
  }

  return extractReceiptUrl(webhookPayload)
}
