import { updateOrderCopies } from '../../../../utils/batch'
import { prisma } from '../../../../utils/prisma'

interface PatchOrderBody {
  copies: number
  telegramUserId?: string
  maxUserId?: string
}

async function resolveUserId(body: PatchOrderBody): Promise<string> {
  if (body.telegramUserId) {
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(body.telegramUserId) },
      select: { id: true },
    })
    if (user) {
      return user.id
    }
  }

  if (body.maxUserId) {
    const user = await prisma.user.findUnique({
      where: { maxUserId: BigInt(body.maxUserId) },
      select: { id: true },
    })
    if (user) {
      return user.id
    }
  }

  throw createError({
    statusCode: 401,
    data: { error: 'Unauthorized', code: 'UNAUTHORIZED' },
  })
}

export default defineEventHandler(async (event) => {
  const batchId = getRouterParam(event, 'batchId')
  const orderId = getRouterParam(event, 'orderId')
  if (!batchId || !orderId) {
    throw createError({
      statusCode: 400,
      data: { error: 'batchId and orderId are required', code: 'MISSING_PARAMS' },
    })
  }

  const body = await readBody<PatchOrderBody>(event)
  if (!body || !Number.isInteger(body.copies)) {
    throw createError({
      statusCode: 400,
      data: { error: 'copies must be an integer', code: 'INVALID_COPIES' },
    })
  }

  const userId = await resolveUserId(body)
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { batchId: true },
  })

  if (!order || order.batchId !== batchId) {
    throw createError({
      statusCode: 404,
      data: { error: 'Order not found in batch', code: 'ORDER_NOT_FOUND' },
    })
  }

  const result = await updateOrderCopies(orderId, userId, body.copies)

  return {
    order: {
      id: result.order.id,
      pageCount: result.order.pageCount,
      copies: result.order.copies,
      amountKopeks: result.order.amountKopeks,
    },
    batch: {
      id: result.batch.id,
      totalPages: result.batch.totalPages,
      totalAmountKopeks: result.batch.totalAmountKopeks,
    },
  }
})
