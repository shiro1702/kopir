import { OrderStatus } from '@prisma/client'
import { assertAgentAuth } from '../../../../utils/agent-auth'
import { checkBatchCompletion } from '../../../../utils/batch'
import { notifyPrintComplete, notifyPrintFailed } from '../../../../utils/bot/core'
import { notifyStaffPrintFailed } from '../../../../utils/staff-notify'
import { deleteOrderFile } from '../../../../utils/blob'
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

  const targetStatus =
    body.status === 'PRINTED' ? OrderStatus.PRINTED : OrderStatus.FAILED

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: targetStatus,
      printedAt: new Date(),
      errorMessage: body.status === 'FAILED' ? body.errorMessage ?? 'Print failed' : null,
    },
  })

  await deleteOrderFile(order.filePath)

  if (order.batchId) {
    await checkBatchCompletion(order.batchId)
    if (targetStatus === OrderStatus.FAILED) {
      try {
        await notifyStaffPrintFailed({
          ...order,
          errorMessage: updated.errorMessage,
        })
      } catch (error) {
        console.error('[complete] staff print failure notify error:', order.id, error)
      }
    }
  } else if (targetStatus === OrderStatus.PRINTED) {
    try {
      await notifyPrintComplete(order.user, order.id)
    } catch (error) {
      console.error('[complete] print notify error:', order.id, error)
    }
  } else {
    try {
      await notifyPrintFailed(order.user, order)
      await notifyStaffPrintFailed({
        ...order,
        errorMessage: updated.errorMessage,
      })
    } catch (error) {
      console.error('[complete] print failure notify error:', order.id, error)
    }
  }

  return { id: updated.id, status: updated.status }
})
