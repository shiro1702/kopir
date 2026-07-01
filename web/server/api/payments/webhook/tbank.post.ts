import {
  handleTbankLegacyWebhook,
  isLegacyTbankWebhookPayload,
  processTbankWebhookNotification,
  verifyTbankWebhookSecret,
} from '../../../utils/payments/providers/tbank-acquiring'
import { isTbankWebhookAlwaysOk, isTbankWebhookDeferOk } from '../../../utils/tbank-config'
import {
  logTbankWebhookReceived,
  scheduleBackgroundTask,
} from '../../../utils/payments/tbank-webhook-log'

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

  logTbankWebhookReceived(body, {
    alwaysOk: isTbankWebhookAlwaysOk(),
    deferOk: isTbankWebhookDeferOk(),
  })

  if (isTbankWebhookAlwaysOk()) {
    const process = () => processTbankWebhookNotification(body)

    if (isTbankWebhookDeferOk()) {
      scheduleBackgroundTask(event, process())
      return respondTbankOk(event)
    }

    await process()
    return respondTbankOk(event)
  }

  setResponseStatus(event, 200)
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  await processTbankWebhookNotification(body)
  return 'OK'
})
