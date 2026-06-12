import { OrderStatus } from '@prisma/client'
import { assertAdminAuth } from '../../../../utils/admin-auth'
import { prisma } from '../../../../utils/prisma'
import { notifyPaymentConfirmed } from '../../../../utils/bot/core'

export default defineEventHandler(async (event) => {
  assertAdminAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      data: { error: 'Order id is required', code: 'MISSING_ORDER_ID' },
    })
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: { user: true },
  })

  if (!order) {
    throw createError({
      statusCode: 404,
      data: { error: 'Order not found', code: 'ORDER_NOT_FOUND' },
    })
  }

  if (order.status === OrderStatus.PAID) {
    return { id: order.id, status: order.status, paidAt: order.paidAt?.toISOString() }
  }

  if (order.status !== OrderStatus.AWAITING_PAYMENT) {
    throw createError({
      statusCode: 400,
      data: { error: 'Order is not awaiting payment', code: 'INVALID_STATUS' },
    })
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: OrderStatus.PAID,
      paidAt: new Date(),
    },
  })

  try {
    await notifyPaymentConfirmed(order.user, order.id)
  } catch (error) {
    console.error('[admin] messenger notify failed:', error)
  }

  return {
    id: updated.id,
    status: updated.status,
    paidAt: updated.paidAt?.toISOString(),
  }
})
