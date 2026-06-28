import {
  handleTbankWebhook,
  verifyTbankWebhookSecret,
  type TbankWebhookPayload,
} from '../../../utils/payments/providers/tbank-acquiring'

export default defineEventHandler(async (event) => {
  const secretHeader = getHeader(event, 'x-tbank-webhook-secret')
    ?? getHeader(event, 'x-webhook-secret')

  if (!verifyTbankWebhookSecret(secretHeader)) {
    throw createError({
      statusCode: 401,
      data: { error: 'Invalid webhook secret', code: 'UNAUTHORIZED' },
    })
  }

  const body = await readBody<TbankWebhookPayload>(event)
  return handleTbankWebhook(body)
})
