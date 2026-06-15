import { webhookCallback } from 'grammy'
import { getBot } from '../../utils/telegram/bot'

let handler: ReturnType<typeof webhookCallback> | null = null

function getWebhookHandler() {
  if (!handler) {
    handler = webhookCallback(getBot(), 'std/http')
  }
  return handler
}

export default defineEventHandler(async (event) => {
  try {
    const handleUpdate = getWebhookHandler()
    return await handleUpdate(event.node.req, event.node.res)
  } catch (error) {
    console.error('[telegram] webhook error:', error)
    throw createError({
      statusCode: 500,
      data: { error: 'Webhook handler failed', code: 'WEBHOOK_ERROR' },
    })
  }
})
