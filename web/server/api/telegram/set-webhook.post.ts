import { assertAdminAuth } from '../../utils/admin-auth'
import { resolveWebhookUrl } from '../../utils/webhook-url'

export default defineEventHandler(async (event) => {
  assertAdminAuth(event)

  const { getInitializedBot } = await import('../../utils/telegram/bot')
  const webhookUrl = resolveWebhookUrl(event, '/api/telegram/webhook')

  await (await getInitializedBot()).api.setWebhook(webhookUrl)

  return { ok: true, webhookUrl }
})
