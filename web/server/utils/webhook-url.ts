import type { H3Event } from 'h3'

export function resolveWebhookUrl(event: H3Event, path: string): string {
  const vercelUrl = process.env.VERCEL_URL
  if (vercelUrl) {
    return `https://${vercelUrl}${path}`
  }

  const host = getHeader(event, 'host')
  const proto = getHeader(event, 'x-forwarded-proto') ?? 'http'
  if (host) {
    return `${proto}://${host}${path}`
  }

  throw createError({
    statusCode: 400,
    data: {
      error: 'Cannot determine webhook URL. Deploy to Vercel or set VERCEL_URL.',
      code: 'MISSING_WEBHOOK_URL',
    },
  })
}
