import {
  handleTbankLegacyWebhook,
  isLegacyTbankWebhookPayload,
  processTbankWebhookNotification,
  verifyTbankWebhookSecret,
} from '../../../utils/payments/providers/tbank-acquiring'
import { scheduleWebhookBackgroundTask } from '../../../utils/payments/tbank-log'

import type { H3Event } from 'h3'

function respondTbankOk(event: H3Event) {
  setResponseStatus(event, 200)
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  return 'OK'
}

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

  // T-Bank requires 200 + plain "OK" even when processing fails (they retry on errors).
  scheduleWebhookBackgroundTask(event, processTbankWebhookNotification(body))
  return respondTbankOk(event)
})
