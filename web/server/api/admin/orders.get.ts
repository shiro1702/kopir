import { OrderStatus } from '@prisma/client'
import { assertAdminAuth } from '../../utils/admin-auth'
import { prisma } from '../../utils/prisma'

const VALID_STATUSES = new Set<string>(Object.values(OrderStatus))

function parseStatuses(raw: string | undefined): OrderStatus[] {
  if (!raw) {
    return [OrderStatus.AWAITING_PAYMENT]
  }

  const statuses = raw.split(',').map((part) => part.trim()).filter(Boolean)
  const invalid = statuses.filter((status) => !VALID_STATUSES.has(status))
  if (invalid.length > 0) {
    throw createError({
      statusCode: 400,
      data: { error: `Invalid status: ${invalid.join(', ')}`, code: 'INVALID_STATUS' },
    })
  }

  return statuses as OrderStatus[]
}

function parseLimit(raw: string | undefined): number | undefined {
  if (!raw) {
    return undefined
  }

  const limit = Number.parseInt(raw, 10)
  if (!Number.isFinite(limit) || limit < 1) {
    throw createError({
      statusCode: 400,
      data: { error: 'limit must be a positive integer', code: 'INVALID_LIMIT' },
    })
  }

  return Math.min(limit, 200)
}

export default defineEventHandler(async (event) => {
  assertAdminAuth(event)

  const query = getQuery(event)
  const statuses = parseStatuses(query.status as string | undefined)
  const limit = parseLimit(query.limit as string | undefined)

  const orders = await prisma.order.findMany({
    where: { status: { in: statuses } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: true,
      point: true,
      batch: { select: { createdAt: true } },
    },
  })

  return {
    orders: orders.map((order) => ({
      id: order.id,
      shortId: order.id.slice(-6),
      fileName: order.fileName,
      pageCount: order.pageCount,
      amountKopeks: order.amountKopeks,
      batchId: order.batchId,
      batchIndex: order.batchIndex,
      batchCreatedAt: order.batch?.createdAt.toISOString() ?? null,
      paymentConfirmedAt: order.paymentConfirmedAt?.toISOString() ?? null,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      paidAt: order.paidAt?.toISOString() ?? null,
      printedAt: order.printedAt?.toISOString() ?? null,
      errorMessage: order.errorMessage,
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
