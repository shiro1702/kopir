import type { H3Event } from 'h3'

function normalizeSiteBase(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) {
    return ''
  }
  return trimmed.startsWith('http') ? trimmed.replace(/\/$/, '') : `https://${trimmed.replace(/\/$/, '')}`
}

export function resolveWebhookUrl(event: H3Event, path: string): string {
  const siteUrl = normalizeSiteBase(process.env.NUXT_PUBLIC_SITE_URL ?? '')
  if (siteUrl) {
    return `${siteUrl}${path}`
  }

  const vercelUrl = process.env.VERCEL_URL?.trim()
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
      error: 'Cannot determine webhook URL. Set NUXT_PUBLIC_SITE_URL or deploy to Vercel.',
      code: 'MISSING_WEBHOOK_URL',
    },
  })
}
