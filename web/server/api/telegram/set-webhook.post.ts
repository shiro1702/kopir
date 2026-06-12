import type { H3Event } from 'h3'
import { assertAdminAuth } from '../../utils/admin-auth'
import { getBot } from '../../utils/telegram/bot'

function resolveWebhookUrl(event: H3Event): string {
  const vercelUrl = process.env.VERCEL_URL
  if (vercelUrl) {
    return `https://${vercelUrl}/api/telegram/webhook`
  }

  const host = getHeader(event, 'host')
  const proto = getHeader(event, 'x-forwarded-proto') ?? 'http'
  if (host) {
    return `${proto}://${host}/api/telegram/webhook`
  }

  throw createError({
    statusCode: 400,
    data: {
      error: 'Cannot determine webhook URL. Deploy to Vercel or set VERCEL_URL.',
      code: 'MISSING_WEBHOOK_URL',
    },
  })
}

export default defineEventHandler(async (event) => {
  assertAdminAuth(event)

  const bot = getBot()
  const webhookUrl = resolveWebhookUrl(event)

  await bot.api.setWebhook(webhookUrl)

  return { ok: true, webhookUrl }
})
