import { OrderStatus } from '@prisma/client'
import { assertAgentAuth } from '../../../../utils/agent-auth'
import { notifyCalculationFailed, notifyQuoteReady } from '../../../../utils/bot/core'
import { getPricePerPageKopeks, isCalculationTimeoutError } from '../../../../utils/calculation'
import { prisma } from '../../../../utils/prisma'
import { touchPointAgentSeen } from '../../../../utils/points'

interface CalculationBody {
  status: 'OK' | 'FAILED'
  pageCount?: number
  errorMessage?: string
}

export default defineEventHandler(async (event) => {
  assertAgentAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      data: { error: 'Order id is required', code: 'MISSING_ORDER_ID' },
    })
  }

  const body = await readBody<CalculationBody>(event)
  if (!body?.status || !['OK', 'FAILED'].includes(body.status)) {
    throw createError({
      statusCode: 400,
      data: { error: 'status must be OK or FAILED', code: 'INVALID_STATUS' },
    })
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: { user: true, point: true },
  })
  if (!order) {
    throw createError({
      statusCode: 404,
      data: { error: 'Order not found', code: 'ORDER_NOT_FOUND' },
    })
  }

  if (order.status === OrderStatus.AWAITING_PAYMENT && body.status === 'OK') {
    throw createError({
      statusCode: 409,
      data: { error: 'Order already calculated', code: 'ALREADY_CALCULATED' },
    })
  }

  const canAcceptResult = order.status === OrderStatus.CALCULATING
    || (body.status === 'OK' && order.status === OrderStatus.CALCULATION_FAILED
      && isCalculationTimeoutError(order.errorMessage))

  if (!canAcceptResult) {
    throw createError({
      statusCode: 400,
      data: { error: 'Order is not in CALCULATING status', code: 'INVALID_STATUS' },
    })
  }

  await touchPointAgentSeen(order.pointId)

  if (body.status === 'FAILED') {
    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.CALCULATION_FAILED,
        errorMessage: body.errorMessage?.trim() || 'Calculation failed',
      },
    })

    try {
      await notifyCalculationFailed(order.user, {
        id: order.id,
        fileName: order.fileName,
        errorMessage: updated.errorMessage,
        batchId: order.batchId,
        batchIndex: order.batchIndex,
        clientMessageId: order.clientMessageId,
        clientMessageChatId: order.clientMessageChatId,
        status: updated.status,
      })
    } catch (error) {
      console.error('[calculation] failed notify error:', order.id, error)
    }

    return { id: updated.id, status: updated.status }
  }

  const pageCount = body.pageCount
  if (!pageCount || !Number.isInteger(pageCount) || pageCount < 1) {
    throw createError({
      statusCode: 400,
      data: { error: 'pageCount must be a positive integer', code: 'INVALID_PAGE_COUNT' },
    })
  }

  const amountKopeks = pageCount * getPricePerPageKopeks(order.point)
  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: OrderStatus.AWAITING_PAYMENT,
      pageCount,
      amountKopeks,
      calculatedAt: new Date(),
      errorMessage: null,
    },
  })

  if (order.batchId) {
    const { recalculateBatchTotals } = await import('../../../../utils/batch')
    await recalculateBatchTotals(order.batchId)
  }

  try {
    await notifyQuoteReady(order.user, {
      id: updated.id,
      fileName: updated.fileName,
      pageCount: updated.pageCount,
      amountKopeks: updated.amountKopeks,
      batchId: order.batchId,
      batchIndex: order.batchIndex,
      clientMessageId: order.clientMessageId,
      clientMessageChatId: order.clientMessageChatId,
    })
  } catch (error) {
    console.error('[calculation] quote notify error:', order.id, error)
  }

  return {
    id: updated.id,
    status: updated.status,
    pageCount: updated.pageCount,
    amountKopeks: updated.amountKopeks,
  }
})
