import { assertAdminAuth } from '../../../../utils/admin-auth'
import { resolveTelegramBotUsernameForAdmin } from '../../../../utils/bind-tokens'
import { buildPointClientLinksForSlug } from '../../../../utils/point-links'
import { generatePointPosterPdf } from '../../../../utils/point-poster'
import { prisma } from '../../../../utils/prisma'

export default defineEventHandler(async (event) => {
  assertAdminAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      data: { error: 'Point id is required', code: 'ID_REQUIRED' },
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
  const telegramBotUsername = await resolveTelegramBotUsernameForAdmin()
  const pdfBytes = await generatePointPosterPdf({
    pointName: point.name,
    pricePerPageKopeks: point.pricePerPageKopeks,
    links,
    telegramBotUsername,
  })

  const safeSlug = point.slug.replace(/[^a-z0-9_-]+/gi, '_')
  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `attachment; filename="kopir-poster-${safeSlug}.pdf"`)
  setHeader(event, 'Cache-Control', 'private, no-store')
  return pdfBytes
})
