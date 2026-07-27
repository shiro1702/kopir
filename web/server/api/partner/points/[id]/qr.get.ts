import {
  assertPartnerOwnsPointById,
  requirePartnerSession,
} from '../../../../utils/partner-session'
import {
  buildPointClientLinksForSlug,
  getPointClientDeepLink,
} from '../../../../utils/point-links'
import { generateStyledPointQrPng } from '../../../../utils/point-qr'
import { prisma } from '../../../../utils/prisma'

const VALID_PLATFORMS = new Set(['telegram', 'max', 'go'])

export default defineEventHandler(async (event) => {
  const partner = await requirePartnerSession(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      data: { error: 'Point id is required', code: 'ID_REQUIRED' },
    })
  }

  await assertPartnerOwnsPointById(partner.id, id)

  const platformQuery = String(getQuery(event).platform ?? '').trim()
  if (!VALID_PLATFORMS.has(platformQuery)) {
    throw createError({
      statusCode: 400,
      data: { error: 'platform must be telegram, max, or go', code: 'INVALID_PLATFORM' },
    })
  }

  const point = await prisma.point.findUnique({ where: { id } })
  if (!point) {
    throw createError({
      statusCode: 404,
      data: { error: 'Point not found', code: 'NOT_FOUND' },
    })
  }

  const links = await buildPointClientLinksForSlug(point.slug)
  const deepLink = getPointClientDeepLink(links, platformQuery as 'telegram' | 'max' | 'go')
  if (!deepLink) {
    throw createError({
      statusCode: 503,
      data: {
        error: `${platformQuery} deep link is not configured`,
        code: 'LINK_NOT_CONFIGURED',
      },
    })
  }

  const png = await generateStyledPointQrPng(deepLink, platformQuery as 'telegram' | 'max' | 'go', 300)

  setHeader(event, 'Content-Type', 'image/png')
  setHeader(event, 'Cache-Control', 'private, max-age=300')
  return png
})
