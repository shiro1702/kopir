import { resolveTelegramBotUsernameForAdmin } from './bind-tokens'
import { pointAgentStatusPayload } from './points'

export type PointClientLinks = {
  slug: string
  telegramPayload: string
  telegramDeepLink: string | null
  maxPayload: string
  maxDeepLink: string | null
  goLink: string | null
  telegramConfigured: boolean
  maxConfigured: boolean
}

export type PointClientLinksConfig = {
  telegramBotUsername: string | null
  telegramBotToken: string | null
  maxBotLink: string
  maxBotUsername: string
  maxBotToken: string | null
  siteUrl: string
}

export function getPointClientLinksConfig(): PointClientLinksConfig {
  const config = useRuntimeConfig()
  return {
    telegramBotUsername: String(config.telegramBotUsername ?? '').trim() || null,
    telegramBotToken: config.telegramBotToken ? String(config.telegramBotToken) : null,
    maxBotLink: String(config.maxBotLink ?? process.env.MAX_BOT_LINK ?? '').trim(),
    maxBotUsername: String(config.maxBotUsername ?? process.env.MAX_BOT_USERNAME ?? '').trim(),
    maxBotToken: config.maxBotToken ? String(config.maxBotToken) : null,
    siteUrl: String(config.public?.siteUrl ?? process.env.NUXT_PUBLIC_SITE_URL ?? '').trim(),
  }
}

function buildTelegramDeepLink(slug: string, username: string | null, hasToken: boolean): string | null {
  if (!username || !hasToken) {
    return null
  }
  return `https://t.me/${username}?start=${encodeURIComponent(slug)}`
}

function buildMaxDeepLink(slug: string, maxBotLink: string, maxBotUsername: string): string | null {
  const base = maxBotLink.replace(/\/$/, '')
  if (base) {
    return `${base}?start=${encodeURIComponent(slug)}`
  }
  const username = maxBotUsername.replace(/^@/, '').trim()
  if (!username) {
    return null
  }
  return `https://max.ru/${username}?start=${encodeURIComponent(slug)}`
}

function buildGoLink(slug: string, siteUrl: string): string | null {
  const base = siteUrl.replace(/\/$/, '')
  if (!base) {
    return null
  }
  return `${base}/go?point=${encodeURIComponent(slug)}`
}

export function buildPointClientLinks(slug: string, config: PointClientLinksConfig): PointClientLinks {
  const trimmedSlug = slug.trim()
  const telegramConfigured = Boolean(config.telegramBotToken)
  const maxConfigured = Boolean(config.maxBotToken)

  return {
    slug: trimmedSlug,
    telegramPayload: trimmedSlug,
    telegramDeepLink: buildTelegramDeepLink(trimmedSlug, config.telegramBotUsername, telegramConfigured),
    maxPayload: trimmedSlug,
    maxDeepLink: maxConfigured
      ? buildMaxDeepLink(trimmedSlug, config.maxBotLink, config.maxBotUsername)
      : null,
    goLink: buildGoLink(trimmedSlug, config.siteUrl),
    telegramConfigured,
    maxConfigured,
  }
}

export async function buildPointClientLinksForSlug(slug: string): Promise<PointClientLinks> {
  const config = getPointClientLinksConfig()
  const username = await resolveTelegramBotUsernameForAdmin()
  return buildPointClientLinks(slug, {
    ...config,
    telegramBotUsername: username ?? config.telegramBotUsername,
  })
}

export function getPointClientDeepLink(
  links: PointClientLinks,
  platform: 'telegram' | 'max',
): string | null {
  return platform === 'telegram' ? links.telegramDeepLink : links.maxDeepLink
}

export function resolveMaxBotDisplayLabel(config: Pick<PointClientLinksConfig, 'maxBotLink' | 'maxBotUsername'>): string | null {
  const username = config.maxBotUsername.replace(/^@/, '').trim()
  if (username) {
    return username
  }
  const match = config.maxBotLink.match(/max\.ru\/([^/?]+)/i)
  return match?.[1] ?? null
}

export async function buildPointClientLinksPayloadForPoint(point: {
  id: string
  slug: string
  name: string
  pricePerPageKopeks: number
  lastSeenAt: Date | null
}) {
  const links = await buildPointClientLinksForSlug(point.slug)
  const status = pointAgentStatusPayload(point)

  return {
    point: {
      id: point.id,
      name: point.name,
      slug: point.slug,
      pricePerPageKopeks: point.pricePerPageKopeks,
      agentOnline: status.agentOnline,
    },
    links,
  }
}
