import { bindBatchToPoint, getActiveCollectingBatch, getOrCreateCollectingBatch } from '../../../utils/batch'
import { serializePrintBatch } from '../../../utils/print-batch-dto'
import { requirePrintSessionUser } from '../../../utils/print-session'
import { prisma } from '../../../utils/prisma'

interface PointBody {
  pointSlug?: string
}

export default defineEventHandler(async (event) => {
  const user = await requirePrintSessionUser(event)
  const body = await readBody<PointBody>(event)
  const slug = typeof body?.pointSlug === 'string' ? body.pointSlug.trim() : ''
  if (!slug) {
    throw createError({
      statusCode: 400,
      data: { error: 'pointSlug is required', code: 'MISSING_POINT' },
    })
  }

  const point = await prisma.point.findFirst({
    where: { slug, isActive: true },
    select: { id: true, slug: true },
  })
  if (!point) {
    throw createError({
      statusCode: 404,
      data: { error: 'Точка не найдена', code: 'POINT_NOT_FOUND' },
    })
  }

  let batch = await getActiveCollectingBatch(user.id)
  if (!batch) {
    batch = await getOrCreateCollectingBatch(user.id, point.id)
  } else {
    await bindBatchToPoint(batch.id, point.id, user.id)
  }

  const fresh = await prisma.orderBatch.findUnique({
    where: { id: batch.id },
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

  return { batch: fresh ? serializePrintBatch(fresh) : null }
})
