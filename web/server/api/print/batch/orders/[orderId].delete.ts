import { removeOrderFromBatch } from '../../../../utils/batch'
import { serializePrintBatch } from '../../../../utils/print-batch-dto'
import { requirePrintSessionUser } from '../../../../utils/print-session'
import { prisma } from '../../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await requirePrintSessionUser(event)
  const orderId = getRouterParam(event, 'orderId')
  if (!orderId) {
    throw createError({
      statusCode: 400,
      data: { error: 'orderId is required', code: 'MISSING_PARAMS' },
    })
  }

  const result = await removeOrderFromBatch(orderId, user.id)

  if (result.batchCancelled) {
    return { batch: null, removed: true }
  }

  const fresh = await prisma.orderBatch.findUnique({
    where: { id: result.batchId },
    include: {
      orders: { orderBy: { batchIndex: 'asc' } },
      point: {
        select: {
          id: true,
          slug: true,
          name: true,
          address: true,
          displayCode: true,
          pricePerPageKopeks: true,
          citySlug: true,
        },
      },
    },
  })

  return {
    batch: fresh ? serializePrintBatch(fresh) : null,
    removed: true,
  }
})
