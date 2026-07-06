import QRCode from 'qrcode'
import { assertAdminAuth } from '../../../../utils/admin-auth'
import {
  buildPointClientLinksForSlug,
  getPointClientDeepLink,
} from '../../../../utils/point-links'
import { prisma } from '../../../../utils/prisma'

const VALID_PLATFORMS = new Set(['telegram', 'max'])

export default defineEventHandler(async (event) => {
  assertAdminAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      data: { error: 'Point id is required', code: 'ID_REQUIRED' },
    })
  }

  const platform = String(getQuery(event).platform ?? '').trim()
  if (!VALID_PLATFORMS.has(platform)) {
    throw createError({
      statusCode: 400,
      data: { error: 'platform must be telegram or max', code: 'INVALID_PLATFORM' },
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
  const deepLink = getPointClientDeepLink(links, platform as 'telegram' | 'max')
  if (!deepLink) {
    throw createError({
      statusCode: 503,
      data: {
        error: `${platform} deep link is not configured`,
        code: 'LINK_NOT_CONFIGURED',
      },
    })
  }

  const png = await QRCode.toBuffer(deepLink, {
    type: 'png',
    width: 300,
    errorCorrectionLevel: 'H',
    margin: 2,
  })

  setHeader(event, 'Content-Type', 'image/png')
  setHeader(event, 'Cache-Control', 'private, max-age=300')
  return png
})
