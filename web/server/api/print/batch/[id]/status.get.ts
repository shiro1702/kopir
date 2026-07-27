import { isActiveBatchOrder } from '../../../../utils/batch'
import { checkTbankPaymentStatusByUserId } from '../../../../utils/payments/providers/tbank-acquiring'
import { serializePrintBatch } from '../../../../utils/print-batch-dto'
import { requirePrintSessionUser } from '../../../../utils/print-session'
import { prisma } from '../../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await requirePrintSessionUser(event)
  const batchId = getRouterParam(event, 'id')
  if (!batchId) {
    throw createError({
      statusCode: 400,
      data: { error: 'batch id is required', code: 'MISSING_PARAMS' },
    })
  }

  const batch = await prisma.orderBatch.findUnique({
    where: { id: batchId },
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
      payments: {
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!batch || batch.userId !== user.id) {
    throw createError({
      statusCode: 404,
      data: { error: 'Заказ не найден', code: 'BATCH_NOT_FOUND' },
    })
  }

  const paymentIdQuery = typeof getQuery(event).paymentId === 'string'
    ? String(getQuery(event).paymentId)
    : ''
  const pendingPayment = batch.payments[0]
  const paymentId = paymentIdQuery || pendingPayment?.id || null

  let paymentCheck: Awaited<ReturnType<typeof checkTbankPaymentStatusByUserId>> | null = null
  if (paymentId && (batch.status === 'AWAITING_PAYMENT' || batch.status === 'PAID')) {
    try {
      paymentCheck = await checkTbankPaymentStatusByUserId(paymentId, user.id)
    } catch {
      paymentCheck = null
    }
  }

  const refreshed = paymentCheck && !('pending' in paymentCheck && paymentCheck.pending)
    ? await prisma.orderBatch.findUnique({
        where: { id: batchId },
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
    : batch

  const activeOrders = (refreshed ?? batch).orders.filter(isActiveBatchOrder)
  const allPrinted = activeOrders.length > 0
    && activeOrders.every((o) => o.status === 'PRINTED')
  const anyPrinting = activeOrders.some((o) => o.status === 'PRINTING' || o.status === 'PAID')

  return {
    batch: refreshed ? serializePrintBatch(refreshed) : serializePrintBatch(batch),
    paymentId,
    payment: pendingPayment
      ? {
          paymentId: pendingPayment.id,
          payUrl: pendingPayment.qrPayload,
          amountKopeks: pendingPayment.amountKopeks,
        }
      : null,
    paymentCheck,
    progress: {
      allPrinted,
      anyPrinting,
    },
  }
})
