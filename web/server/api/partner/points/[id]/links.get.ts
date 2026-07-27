import {
  assertPartnerOwnsPointById,
  requirePartnerSession,
} from '../../../../utils/partner-session'
import { buildPointClientLinksPayloadForPoint } from '../../../../utils/point-links'
import { prisma } from '../../../../utils/prisma'

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

  const point = await prisma.point.findUnique({ where: { id } })
  if (!point) {
    throw createError({
      statusCode: 404,
      data: { error: 'Point not found', code: 'NOT_FOUND' },
    })
  }

  return buildPointClientLinksPayloadForPoint(point)
})
