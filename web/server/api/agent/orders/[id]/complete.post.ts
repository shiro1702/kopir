import { OrderStatus } from '@prisma/client'
import { assertAgentAuth } from '../../../../utils/agent-auth'
import { checkBatchCompletion } from '../../../../utils/batch'
import { notifyPrintComplete } from '../../../../utils/bot/core'
import { deleteOrderFile } from '../../../../utils/blob'
import { handleOrderPrintFailure } from '../../../../utils/order-staff-actions'
import { prisma } from '../../../../utils/prisma'
import { touchPointAgentSeen } from '../../../../utils/points'

interface CompleteBody {
  status: 'PRINTED' | 'FAILED'
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

  const body = await readBody<CompleteBody>(event)
  if (!body?.status || !['PRINTED', 'FAILED'].includes(body.status)) {
    throw createError({
      statusCode: 400,
      data: { error: 'status must be PRINTED or FAILED', code: 'INVALID_STATUS' },
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

  if (order.status === OrderStatus.PRINTED || order.status === OrderStatus.FAILED) {
    return { id: order.id, status: order.status }
  }

  if (order.status !== OrderStatus.PRINTING) {
    throw createError({
      statusCode: 400,
      data: { error: 'Order is not in PRINTING status', code: 'INVALID_STATUS' },
    })
  }

  await touchPointAgentSeen(order.pointId)

  if (body.status === 'PRINTED') {
    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.PRINTED,
        printedAt: new Date(),
        errorMessage: null,
      },
    })

    await deleteOrderFile(order.filePath)

    if (order.batchId) {
      await checkBatchCompletion(order.batchId)
    } else {
      try {
        await notifyPrintComplete(order.user, order.id)
      } catch (error) {
        console.error('[complete] print notify error:', order.id, error)
      }
    }

    return { id: updated.id, status: updated.status }
  }

  const result = await handleOrderPrintFailure(
    order,
    body.errorMessage ?? 'Print failed',
  )

  return { id: result.id, status: result.status }
})
