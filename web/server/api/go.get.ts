import {
  buildPointClientLinksForSlug,
  getPointClientLinksConfig,
  resolveMaxBotDisplayLabel,
} from '../utils/point-links'
import { pointAgentStatusPayload, resolvePointBySlug } from '../utils/points'

export default defineEventHandler(async (event) => {
  const slug = String(getQuery(event).point ?? '').trim()
  if (!slug) {
    throw createError({
      statusCode: 400,
      data: { error: 'point query parameter is required', code: 'POINT_REQUIRED' },
    })
  }

  const point = await resolvePointBySlug(slug)
  const links = await buildPointClientLinksForSlug(point.slug)
  const config = getPointClientLinksConfig()
  const status = pointAgentStatusPayload(point)

  return {
    point: {
      slug: point.slug,
      name: point.name,
      pricePerPageKopeks: point.pricePerPageKopeks,
      agentOnline: status.agentOnline,
    },
    links: {
      telegramDeepLink: links.telegramDeepLink,
      maxDeepLink: links.maxDeepLink,
      goLink: links.goLink,
      payload: links.telegramPayload,
    },
    channels: {
      telegramConfigured: links.telegramConfigured,
      maxConfigured: links.maxConfigured,
      goConfigured: Boolean(links.goLink),
    },
    telegramBotUsername: config.telegramBotUsername,
    maxBotLabel: resolveMaxBotDisplayLabel(config),
  }
})
