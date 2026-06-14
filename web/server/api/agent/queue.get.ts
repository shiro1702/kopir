import { OrderStatus } from '@prisma/client'
import { assertAgentAuth } from '../../utils/agent-auth'
import { expireStaleCalculations } from '../../utils/calculation'
import { prisma } from '../../utils/prisma'
import { resolvePointBySlug } from '../../utils/points'

type QueueKind = 'calculate' | 'print'

function parseQueueKind(raw: string | undefined): QueueKind {
  if (raw === 'calculate') {
    return 'calculate'
  }
  return 'print'
}

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

  const kind = parseQueueKind(query.kind as string | undefined)
  const point = await resolvePointBySlug(pointSlug)

  if (kind === 'calculate') {
    await expireStaleCalculations(point.id)

    const orders = await prisma.order.findMany({
      where: {
        pointId: point.id,
        status: OrderStatus.CALCULATING,
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        fileName: true,
        mimeType: true,
        createdAt: true,
      },
    })

    return {
      orders: orders.map((order) => ({
        id: order.id,
        fileName: order.fileName,
        mimeType: order.mimeType,
        downloadUrl: `/api/agent/orders/${order.id}/file`,
        createdAt: order.createdAt.toISOString(),
      })),
    }
  }

  const orders = await prisma.order.findMany({
    where: {
      pointId: point.id,
      status: OrderStatus.PAID,
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      pageCount: true,
      createdAt: true,
    },
  })

  return {
    orders: orders.map((order) => ({
      id: order.id,
      fileName: order.fileName,
      mimeType: order.mimeType,
      downloadUrl: `/api/agent/orders/${order.id}/file`,
      pageCount: order.pageCount,
      createdAt: order.createdAt.toISOString(),
    })),
  }
})
