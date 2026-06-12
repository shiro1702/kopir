import { assertAdminAuth } from '../../utils/admin-auth'
import { getBot } from '../../utils/telegram/bot'
import { resolveWebhookUrl } from '../../utils/webhook-url'

export default defineEventHandler(async (event) => {
  assertAdminAuth(event)

  const bot = getBot()
  const webhookUrl = resolveWebhookUrl(event, '/api/telegram/webhook')

  await bot.api.setWebhook(webhookUrl)

  return { ok: true, webhookUrl }
})
