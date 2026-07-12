import { assertAdminAuth } from '../../../../utils/admin-auth'
import { prisma } from '../../../../utils/prisma'

export default defineEventHandler(async (event) => {
  assertAdminAuth(event)

  const pointId = getRouterParam(event, 'id')
  if (!pointId) {
    throw createError({
      statusCode: 400,
      data: { error: 'Point id is required', code: 'ID_REQUIRED' },
    })
  }

  const point = await prisma.point.findUnique({
    where: { id: pointId },
    select: { id: true, partnerId: true },
  })
  if (!point) {
    throw createError({
      statusCode: 404,
      data: { error: 'Point not found', code: 'NOT_FOUND' },
    })
  }

  if (!point.partnerId) {
    throw createError({
      statusCode: 400,
      data: { error: 'Партнёр не привязан к этой точке', code: 'PARTNER_NOT_BOUND' },
    })
  }

  await prisma.point.update({
    where: { id: pointId },
    data: { partnerId: null },
  })

  return { ok: true }
})
