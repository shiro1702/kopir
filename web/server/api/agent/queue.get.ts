import { OrderStatus } from '@prisma/client'
import { assertAgentAuth } from '../../utils/agent-auth'
import { prisma } from '../../utils/prisma'
import { resolvePointBySlug } from '../../utils/points'

export default defineEventHandler(async (event) => {
  assertAgentAuth(event)

  const query = getQuery(event)
  const pointSlug = query.pointId as string | undefined
  if (!pointSlug) {
    throw createError({
      statusCode: 400,
      data: { error: 'pointId query parameter is required', code: 'MISSING_POINT_ID' },
    })
  }

  const point = await resolvePointBySlug(pointSlug)

  const orders = await prisma.order.findMany({
    where: {
      pointId: point.id,
      status: OrderStatus.PAID,
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      fileName: true,
      pageCount: true,
      createdAt: true,
    },
  })

  return {
    orders: orders.map((order) => ({
      id: order.id,
      fileName: order.fileName,
      downloadUrl: `/api/agent/orders/${order.id}/file`,
      pageCount: order.pageCount,
      createdAt: order.createdAt.toISOString(),
    })),
  }
})
