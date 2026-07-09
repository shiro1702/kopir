import { assertAdminAuth } from '../../utils/admin-auth'
import { resolveWebhookUrl } from '../../utils/webhook-url'

export default defineEventHandler(async (event) => {
  assertAdminAuth(event)

  const { getInitializedBot, registerTelegramCommands } = await import('../../utils/telegram/bot')
  const webhookUrl = resolveWebhookUrl(event, '/api/telegram/webhook')

  await (await getInitializedBot()).api.setWebhook(webhookUrl)
  await registerTelegramCommands()

  return { ok: true, webhookUrl }
})
