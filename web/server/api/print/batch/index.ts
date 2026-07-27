import {
  getActiveCollectingBatch,
  getOrCreateCollectingBatch,
} from '../../../utils/batch'
import { serializePrintBatch } from '../../../utils/print-batch-dto'
import { requirePrintSessionUser } from '../../../utils/print-session'
import { prisma } from '../../../utils/prisma'

const printBatchInclude = {
  orders: { orderBy: { batchIndex: 'asc' as const } },
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
}

export default defineEventHandler(async (event) => {
  const user = await requirePrintSessionUser(event)
  const method = event.method

  if (method === 'GET') {
    const batch = await getActiveCollectingBatch(user.id)
    if (!batch) {
      return { batch: null }
    }
    const fresh = await prisma.orderBatch.findUnique({
      where: { id: batch.id },
      include: printBatchInclude,
    })
    return { batch: fresh ? serializePrintBatch(fresh) : null }
  }

  if (method === 'POST') {
    const body = (await readBody<{ pointSlug?: string }>(event).catch(() => null)) ?? {}
    let pointId: string | null = null
    const slug = typeof body.pointSlug === 'string' ? body.pointSlug.trim() : ''
    if (slug) {
      const point = await prisma.point.findFirst({
        where: { slug, isActive: true },
        select: { id: true },
      })
      if (!point) {
        throw createError({
          statusCode: 404,
          data: { error: 'Точка не найдена', code: 'POINT_NOT_FOUND' },
        })
      }
      pointId = point.id
    } else if (user.lastPointId) {
      pointId = user.lastPointId
    }

    const batch = await getOrCreateCollectingBatch(user.id, pointId)
    const fresh = await prisma.orderBatch.findUnique({
      where: { id: batch.id },
      include: printBatchInclude,
    })
    return { batch: fresh ? serializePrintBatch(fresh) : null }
  }

  throw createError({
    statusCode: 405,
    data: { error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' },
  })
})
