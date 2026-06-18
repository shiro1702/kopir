import { assertAdminAuth } from '../../../utils/admin-auth'
import { getBatchWithOrders } from '../../../utils/batch'

export default defineEventHandler(async (event) => {
  assertAdminAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      data: { error: 'Batch id is required', code: 'MISSING_BATCH_ID' },
    })
  }

  const batch = await getBatchWithOrders(id)

  return {
    batch: {
      id: batch.id,
      shortId: batch.id.slice(-6),
      status: batch.status,
      totalPages: batch.totalPages,
      totalAmountKopeks: batch.totalAmountKopeks,
      paidAt: batch.paidAt?.toISOString() ?? null,
      createdAt: batch.createdAt.toISOString(),
      user: {
        messenger: batch.user.telegramId ? 'telegram' : 'max',
        telegramId: batch.user.telegramId?.toString() ?? null,
        maxUserId: batch.user.maxUserId?.toString() ?? null,
        username: batch.user.username,
        firstName: batch.user.firstName,
      },
      point: {
        slug: batch.point.slug,
        name: batch.point.name,
      },
      orders: batch.orders.map((order) => ({
        id: order.id,
        shortId: order.id.slice(-6),
        fileName: order.fileName,
        batchIndex: order.batchIndex,
        pageCount: order.pageCount,
        amountKopeks: order.amountKopeks,
        status: order.status,
        createdAt: order.createdAt.toISOString(),
      })),
    },
  }
})
