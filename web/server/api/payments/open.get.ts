import {
  executePaymentOpenRedirect,
  parsePaymentOpenQuery,
} from '../../utils/payments/open-link'

export default defineEventHandler(async (event) => {
  const parsed = parsePaymentOpenQuery(getQuery(event) as Record<string, unknown>)
  if (!parsed) {
    throw createError({
      statusCode: 400,
      data: { error: 'Invalid or expired payment link', code: 'INVALID_PAYMENT_LINK' },
    })
  }

  try {
    const payUrl = await executePaymentOpenRedirect(parsed)
    return sendRedirect(event, payUrl, 302)
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    console.error('[payment] open redirect failed:', error)
    throw createError({
      statusCode: 500,
      data: { error: 'Failed to open payment', code: 'PAYMENT_OPEN_FAILED' },
    })
  }
})
