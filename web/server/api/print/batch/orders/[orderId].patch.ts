import { updateOrderCopies } from '../../../../utils/batch'
import { serializePrintOrder } from '../../../../utils/print-batch-dto'
import { requirePrintSessionUser } from '../../../../utils/print-session'
import { prisma } from '../../../../utils/prisma'
import { recalculateBatchTotals } from '../../../../utils/batch'
import { serializePrintBatch } from '../../../../utils/print-batch-dto'

interface PatchBody {
  copies?: number
}

export default defineEventHandler(async (event) => {
  const user = await requirePrintSessionUser(event)
  const orderId = getRouterParam(event, 'orderId')
  if (!orderId) {
    throw createError({
      statusCode: 400,
      data: { error: 'orderId is required', code: 'MISSING_PARAMS' },
    })
  }

  const body = await readBody<PatchBody>(event)
  if (!body || !Number.isInteger(body.copies)) {
    throw createError({
      statusCode: 400,
      data: { error: 'copies must be an integer', code: 'INVALID_COPIES' },
    })
  }

  const result = await updateOrderCopies(orderId, user.id, body.copies!)
  await recalculateBatchTotals(result.batch.id)

  const fresh = await prisma.orderBatch.findUnique({
    where: { id: result.batch.id },
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
    order: serializePrintOrder(result.order),
    batch: fresh ? serializePrintBatch(fresh) : null,
  }
})
