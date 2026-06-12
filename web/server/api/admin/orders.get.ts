import type { OrderStatus } from '@prisma/client'
import { assertAdminAuth } from '../../utils/admin-auth'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  assertAdminAuth(event)

  const query = getQuery(event)
  const status = (query.status as OrderStatus | undefined) ?? 'AWAITING_PAYMENT'

  const orders = await prisma.order.findMany({
    where: { status },
    orderBy: { createdAt: 'desc' },
    include: {
      user: true,
      point: true,
    },
  })

  return {
    orders: orders.map((order) => ({
      id: order.id,
      shortId: order.id.slice(-6),
      fileName: order.fileName,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      paidAt: order.paidAt?.toISOString() ?? null,
      user: {
        messenger: order.user.telegramId ? 'telegram' : 'max',
        telegramId: order.user.telegramId?.toString() ?? null,
        maxUserId: order.user.maxUserId?.toString() ?? null,
        username: order.user.username,
        firstName: order.user.firstName,
      },
      point: {
        slug: order.point.slug,
        name: order.point.name,
      },
    })),
  }
})
