import { OrderStatus } from '@prisma/client'
import { notifyPaymentReceivedByStaff, notifyPrintStarted } from './bot/core'
import { isTerminalPaymentMode } from './payment-mode'
import { prisma } from './prisma'
import { notifyStaffPaymentConfirmed } from './staff-notify'

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

  if (order.status !== OrderStatus.AWAITING_PAYMENT) {
    throw invalidStatus('Order is not awaiting payment')
  }

  if (order.paymentConfirmedAt) {
    return {
      id: order.id,
      status: order.status,
      paymentConfirmedAt: order.paymentConfirmedAt.toISOString(),
    }
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { paymentConfirmedAt: new Date() },
  })

  try {
    await notifyPaymentReceivedByStaff(order.user, order.id)
    const fullOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, point: true },
    })
    if (fullOrder) {
      await notifyStaffPaymentConfirmed(fullOrder)
    }
  } catch (error) {
    console.error('[staff] payment confirmed notify failed:', orderId, error)
  }

  return {
    id: updated.id,
    status: updated.status,
    paymentConfirmedAt: updated.paymentConfirmedAt!.toISOString(),
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
    await notifyPrintStarted(order.user, order.id)
  } catch (error) {
    console.error('[staff] print started notify failed:', orderId, error)
  }

  return {
    id: updated.id,
    status: updated.status,
    paidAt: updated.paidAt?.toISOString() ?? null,
  }
}
