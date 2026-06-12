import { assertAdminAuth } from '../../utils/admin-auth'
import { getMaxClient } from '../../utils/max/client'
import { resolveWebhookUrl } from '../../utils/webhook-url'

export default defineEventHandler(async (event) => {
  assertAdminAuth(event)

  const config = useRuntimeConfig(event)
  const client = getMaxClient()
  const webhookUrl = resolveWebhookUrl(event, '/api/max/webhook')

  await client.setWebhook(webhookUrl, config.maxWebhookSecret || undefined)

  return {
    ok: true,
    webhookUrl,
    hasSecret: Boolean(config.maxWebhookSecret),
  }
})
