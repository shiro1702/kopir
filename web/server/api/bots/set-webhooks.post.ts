import { assertAdminAuth } from '../../utils/admin-auth'
import { resolveWebhookUrl } from '../../utils/webhook-url'

interface WebhookResult {
  ok: boolean
  webhookUrl?: string
  skipped?: boolean
  reason?: string
  hasSecret?: boolean
  error?: string
}

export default defineEventHandler(async (event) => {
  assertAdminAuth(event)

  const config = useRuntimeConfig(event)
  const results: { telegram: WebhookResult, max: WebhookResult } = {
    telegram: { ok: false, skipped: true, reason: 'TELEGRAM_BOT_TOKEN not set' },
    max: { ok: false, skipped: true, reason: 'MAX_BOT_TOKEN not set' },
  }

  if (config.telegramBotToken) {
    try {
      const { getInitializedBot, registerTelegramClientCommands } = await import('../../utils/telegram/bot')
      const webhookUrl = resolveWebhookUrl(event, '/api/telegram/webhook')
      await (await getInitializedBot()).api.setWebhook(webhookUrl)
      await registerTelegramClientCommands()
      results.telegram = { ok: true, webhookUrl }
    } catch (error) {
      results.telegram = {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  if (config.maxBotToken) {
    try {
      const { getMaxClient } = await import('../../utils/max/client')
      const webhookUrl = resolveWebhookUrl(event, '/api/max/webhook')
      await getMaxClient().setWebhook(webhookUrl, config.maxWebhookSecret || undefined)
      results.max = {
        ok: true,
        webhookUrl,
        hasSecret: Boolean(config.maxWebhookSecret),
      }
    } catch (error) {
      results.max = {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  return results
})
