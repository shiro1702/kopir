import { OrderStatus } from '@prisma/client'
import { assertAgentAuth } from '../../../../utils/agent-auth'
import { prisma } from '../../../../utils/prisma'

export default defineEventHandler(async (event) => {
  assertAgentAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      data: { error: 'Order id is required', code: 'MISSING_ORDER_ID' },
    })
  }

  const order = await prisma.order.findUnique({ where: { id } })
  if (!order) {
    throw createError({
      statusCode: 404,
      data: { error: 'Order not found', code: 'ORDER_NOT_FOUND' },
    })
  }

  if (order.status === OrderStatus.PRINTING) {
    return { id: order.id, status: order.status }
  }

  if (order.status !== OrderStatus.PAID) {
    throw createError({
      statusCode: 400,
      data: { error: 'Order cannot be claimed', code: 'INVALID_STATUS' },
    })
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { status: OrderStatus.PRINTING },
  })

  return { id: updated.id, status: updated.status }
})
