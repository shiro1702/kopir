import {
  handleTbankLegacyWebhook,
  handleTbankNotification,
  isLegacyTbankWebhookPayload,
  verifyTbankWebhookSecret,
} from '../../../utils/payments/providers/tbank-acquiring'

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event)

  if (isLegacyTbankWebhookPayload(body)) {
    const secretHeader = getHeader(event, 'x-tbank-webhook-secret')
      ?? getHeader(event, 'x-webhook-secret')

    if (!verifyTbankWebhookSecret(secretHeader)) {
      throw createError({
        statusCode: 401,
        data: { error: 'Invalid webhook secret', code: 'UNAUTHORIZED' },
      })
    }

    setResponseStatus(event, 200)
    return handleTbankLegacyWebhook(body)
  }

  setResponseStatus(event, 200)
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  try {
    await handleTbankNotification(body)
  } catch (error) {
    const code = error && typeof error === 'object' && 'data' in error
      ? (error as { data?: { code?: string } }).data?.code
      : undefined
    console.error('[tbank] webhook handler error', { code, error })
    throw error
  }
  return 'OK'
})
