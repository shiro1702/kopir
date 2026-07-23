import { OrderBatchStatus, OrderStatus } from '@prisma/client'
import { checkBatchCompletion } from './batch'
import { deleteOrderFile } from './blob'
import { assertReadyForStaffPaymentConfirm } from './payments/service'
import { isTerminalPaymentMode } from './payment-mode'
import { prisma } from './prisma'
import { isPointAgentOnline } from './points'

const MAX_AUTO_PRINT_RETRIES = Math.max(0, Number(process.env.PRINT_MAX_AUTO_RETRIES ?? '1'))

function invalidStatus(message: string) {
  return createError({
    statusCode: 400,
    data: { error: message, code: 'INVALID_STATUS' },
  })
}

export async function confirmOrderPayment(orderId: string) {
  if (!isTerminalPaymentMode()) {
    throw createError({
      statusCode: 400,
      data: {
        error: 'Payment confirmation is only used in terminal payment mode',
        code: 'INVALID_PAYMENT_MODE',
      },
    })
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true },
  })
  if (!order) {
    throw createError({
      statusCode: 404,
      data: { error: 'Order not found', code: 'ORDER_NOT_FOUND' },
    })
  }

  if (order.status === OrderStatus.PAID) {
    return {
      id: order.id,
      status: order.status,
      alreadyConfirmed: true,
      paidAt: order.paidAt?.toISOString() ?? null,
    }
  }

  if (order.status !== OrderStatus.AWAITING_PAYMENT) {
    throw invalidStatus('Order is not awaiting payment')
  }

  if (order.batchId) {
    throw createError({
      statusCode: 400,
      data: {
        error: 'Use batch payment confirmation for orders in a batch',
        code: 'BATCH_ORDER',
      },
    })
  }

  assertReadyForStaffPaymentConfirm(order.paymentMethod, order.paymentClaimedAt)

  if (order.paymentConfirmedAt) {
    if (order.status === OrderStatus.AWAITING_PAYMENT) {
      return startOrderPrint(orderId)
    }
    return {
      id: order.id,
      status: order.status,
      paymentConfirmedAt: order.paymentConfirmedAt.toISOString(),
      paidAt: order.paidAt?.toISOString() ?? null,
    }
  }

  const paymentConfirmedAt = new Date()
  await prisma.order.update({
    where: { id: orderId },
    data: { paymentConfirmedAt },
  })

  try {
    const printResult = await startOrderPrint(orderId)
    return {
      id: printResult.id,
      status: printResult.status,
      paymentConfirmedAt: paymentConfirmedAt.toISOString(),
      paidAt: printResult.paidAt,
    }
  } catch (error) {
    console.error('[staff] payment confirmed notify failed:', orderId, error)
    return {
      id: order.id,
      status: order.status,
      paymentConfirmedAt: paymentConfirmedAt.toISOString(),
    }
  }
}

export async function startOrderPrint(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true },
  })
  if (!order) {
    throw createError({
      statusCode: 404,
      data: { error: 'Order not found', code: 'ORDER_NOT_FOUND' },
    })
  }

  if (order.status === OrderStatus.PAID) {
    return {
      id: order.id,
      status: order.status,
      paidAt: order.paidAt?.toISOString() ?? null,
    }
  }

  if (order.status !== OrderStatus.AWAITING_PAYMENT) {
    throw invalidStatus('Order is not awaiting payment')
  }

  if (order.batchId) {
    throw createError({
      statusCode: 400,
      data: {
        error: 'Use batch payment confirmation for orders in a batch',
        code: 'BATCH_ORDER',
      },
    })
  }

  if (isTerminalPaymentMode() && !order.paymentConfirmedAt) {
    throw createError({
      statusCode: 400,
      data: {
        error: 'Confirm terminal payment before printing',
        code: 'PAYMENT_NOT_CONFIRMED',
      },
    })
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: OrderStatus.PAID,
      paidAt: new Date(),
    },
  })

  try {
    const fullOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, point: true },
    })
    const agentOffline = fullOrder?.point ? !isPointAgentOnline(fullOrder.point) : true
    const { notifyPrintStarted } = await import('./bot/core')
    await notifyPrintStarted(order.user, order.id, agentOffline)
    if (fullOrder?.pointId && fullOrder.point) {
      const { notifyStaffPaymentConfirmed } = await import('./staff-notify')
      await notifyStaffPaymentConfirmed({
        ...fullOrder,
        pointId: fullOrder.pointId,
        point: fullOrder.point,
      })
    }
  } catch (error) {
    console.error('[staff] print started notify failed:', orderId, error)
  }

  return {
    id: updated.id,
    status: updated.status,
    paidAt: updated.paidAt?.toISOString() ?? null,
  }
}

export async function retryOrderPrint(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true },
  })
  if (!order) {
    throw createError({
      statusCode: 404,
      data: { error: 'Order not found', code: 'ORDER_NOT_FOUND' },
    })
  }

  if (order.status === OrderStatus.PAID || order.status === OrderStatus.PRINTING) {
    return {
      id: order.id,
      status: order.status,
      alreadyQueued: true,
    }
  }

  if (order.status !== OrderStatus.FAILED) {
    throw invalidStatus('Order is not failed')
  }

  if (order.batchId) {
    await prisma.orderBatch.updateMany({
      where: {
        id: order.batchId,
        status: OrderBatchStatus.PARTIALLY_FAILED,
      },
      data: { status: OrderBatchStatus.PAID },
    })
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: OrderStatus.PAID,
      errorMessage: null,
      printedAt: null,
    },
  })

  try {
    const { notifyPrintRetryStarted } = await import('./bot/core')
    await notifyPrintRetryStarted(order.user, order.fileName, order.batchId)
    if (order.pointId) {
      const { notifyStaffOrderQueuedWithSource } = await import('./staff-notify')
      await notifyStaffOrderQueuedWithSource({
        ...order,
        pointId: order.pointId,
      })
    }
  } catch (error) {
    console.error('[staff] print retry notify failed:', orderId, error)
  }

  return {
    id: updated.id,
    status: updated.status,
    alreadyQueued: false,
  }
}

type OrderForPrintFailure = {
  id: string
  fileName: string
  filePath: string
  batchId: string | null
  printAttemptCount: number
  pointId: string
  user: {
    telegramId?: bigint | null
    maxUserId?: bigint | null
  }
  point: { name: string }
}

export async function handleOrderPrintFailure(
  order: OrderForPrintFailure,
  errorMessage: string,
): Promise<{ id: string, status: OrderStatus, autoRetried: boolean }> {
  const attemptCount = order.printAttemptCount + 1
  const shouldAutoRetry = attemptCount <= MAX_AUTO_PRINT_RETRIES

  if (shouldAutoRetry) {
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.PAID,
        printAttemptCount: attemptCount,
        errorMessage,
        printedAt: null,
      },
    })

    try {
      const { notifyStaffPrintAutoRetry } = await import('./staff-notify')
      await notifyStaffPrintAutoRetry({
        ...order,
        errorMessage,
      })
      const { notifyPrintAutoRetry } = await import('./bot/core')
      await notifyPrintAutoRetry(order.user, order.fileName, order.batchId)
    } catch (error) {
      console.error('[print-failure] auto-retry notify error:', order.id, error)
    }

    return {
      id: updated.id,
      status: updated.status,
      autoRetried: true,
    }
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: OrderStatus.FAILED,
      printAttemptCount: attemptCount,
      printedAt: new Date(),
      errorMessage,
    },
  })

  const failedOrderPayload = {
    ...order,
    errorMessage: updated.errorMessage,
  }

  if (order.batchId) {
    await checkBatchCompletion(order.batchId)
    try {
      const { notifyStaffPrintFailed } = await import('./staff-notify')
      await notifyStaffPrintFailed(failedOrderPayload)
    } catch (error) {
      console.error('[print-failure] staff notify error:', order.id, error)
    }
  } else {
    try {
      const { notifyPrintFailed } = await import('./bot/core')
      const { notifyStaffPrintFailed } = await import('./staff-notify')
      await notifyPrintFailed(order.user, { ...order, errorMessage: updated.errorMessage })
      await notifyStaffPrintFailed(failedOrderPayload)
    } catch (error) {
      console.error('[print-failure] notify error:', order.id, error)
    }
  }

  try {
    const { notifyPartnerPrintFailed } = await import('./partner-notify')
    await notifyPartnerPrintFailed(failedOrderPayload)
  } catch (error) {
    console.error('[print-failure] partner notify error:', order.id, error)
  }

  return {
    id: updated.id,
    status: updated.status,
    autoRetried: false,
  }
}

export async function confirmManualPrint(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true, point: true },
  })
  if (!order) {
    throw createError({
      statusCode: 404,
      data: { error: 'Order not found', code: 'ORDER_NOT_FOUND' },
    })
  }

  if (order.status === OrderStatus.PRINTED) {
    return {
      id: order.id,
      status: order.status,
      printedAt: order.printedAt?.toISOString() ?? null,
    }
  }

  if (order.status !== OrderStatus.FAILED) {
    throw invalidStatus('Order is not awaiting manual print confirmation')
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: OrderStatus.PRINTED,
      printedAt: new Date(),
      errorMessage: null,
    },
  })

  if (order.filePath) {
    await deleteOrderFile(order.filePath)
  }

  if (order.batchId) {
    await checkBatchCompletion(order.batchId)
  } else {
    try {
      const { notifyPrintComplete } = await import('./bot/core')
      await notifyPrintComplete(order.user, order.id)
    } catch (error) {
      console.error('[staff] manual print notify error:', orderId, error)
    }
  }

  return {
    id: updated.id,
    status: updated.status,
    printedAt: updated.printedAt?.toISOString() ?? null,
  }
}
