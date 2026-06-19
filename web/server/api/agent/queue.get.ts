import { OrderStatus } from '@prisma/client'
import { assertAgentAuth } from '../../utils/agent-auth'
import { expireStaleCalculations } from '../../utils/calculation'
import { prisma } from '../../utils/prisma'
import { resolvePointBySlug, touchPointAgentSeen } from '../../utils/points'

type QueueKind = 'calculate' | 'print'

function parseQueueKind(raw: string | undefined): QueueKind {
  if (raw === 'calculate') {
    return 'calculate'
  }
  return 'print'
}

function sortPrintQueue<T extends {
  createdAt: Date
  batchIndex: number | null
  batch: { createdAt: Date } | null
}>(orders: T[]): T[] {
  return [...orders].sort((a, b) => {
    const aPrimary = a.batch?.createdAt ?? a.createdAt
    const bPrimary = b.batch?.createdAt ?? b.createdAt
    const primaryDiff = aPrimary.getTime() - bPrimary.getTime()
    if (primaryDiff !== 0) {
      return primaryDiff
    }

    const indexDiff = (a.batchIndex ?? 0) - (b.batchIndex ?? 0)
    if (indexDiff !== 0) {
      return indexDiff
    }

    return a.createdAt.getTime() - b.createdAt.getTime()
  })
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
  await touchPointAgentSeen(point.id)

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
        batchId: true,
        batchIndex: true,
        createdAt: true,
        batch: { select: { createdAt: true } },
      },
    })

    const sorted = sortPrintQueue(orders)

    return {
      orders: sorted.map((order) => ({
        id: order.id,
        fileName: order.fileName,
        mimeType: order.mimeType,
        batchId: order.batchId,
        batchIndex: order.batchIndex,
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
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      pageCount: true,
      batchId: true,
      batchIndex: true,
      createdAt: true,
      batch: { select: { createdAt: true } },
    },
  })

  const sorted = sortPrintQueue(orders)

  return {
    orders: sorted.map((order) => ({
      id: order.id,
      fileName: order.fileName,
      mimeType: order.mimeType,
      downloadUrl: `/api/agent/orders/${order.id}/file`,
      pageCount: order.pageCount,
      batchId: order.batchId,
      batchIndex: order.batchIndex,
      createdAt: order.createdAt.toISOString(),
    })),
  }
})
