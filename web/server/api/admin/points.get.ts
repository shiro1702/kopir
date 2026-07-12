import { assertAdminAuth } from '../../utils/admin-auth'
import { serializePointForAdmin } from '../../utils/bind-tokens'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  assertAdminAuth(event)

  const points = await prisma.point.findMany({
    orderBy: { name: 'asc' },
    include: {
      staffChannels: {
        where: { isActive: true },
        orderBy: { boundAt: 'desc' },
      },
      partner: {
        select: {
          id: true,
          name: true,
          telegramId: true,
          maxUserId: true,
        },
      },
    },
  })

  return {
    points: points.map(serializePointForAdmin),
  }
})
