import { assertAdminAuth } from '../../../../../utils/admin-auth'
import { prisma } from '../../../../../utils/prisma'

export default defineEventHandler(async (event) => {
  assertAdminAuth(event)

  const pointId = getRouterParam(event, 'id')
  const channelId = getRouterParam(event, 'channelId')
  if (!pointId || !channelId) {
    throw createError({
      statusCode: 400,
      data: { error: 'Point id and channel id are required', code: 'ID_REQUIRED' },
    })
  }

  const channel = await prisma.staffChannel.findFirst({
    where: { id: channelId, pointId },
  })
  if (!channel) {
    throw createError({
      statusCode: 404,
      data: { error: 'Staff channel not found', code: 'NOT_FOUND' },
    })
  }

  await prisma.staffChannel.delete({ where: { id: channelId } })

  return { ok: true }
})
