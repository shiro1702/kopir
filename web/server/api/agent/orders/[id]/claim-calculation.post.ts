import { OrderStatus } from '@prisma/client'
import { assertAgentAuth } from '../../../../utils/agent-auth'
import { prisma } from '../../../../utils/prisma'
import { touchPointAgentSeen } from '../../../../utils/points'

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

  if (order.status !== OrderStatus.CALCULATING) {
    throw createError({
      statusCode: 400,
      data: { error: 'Order is not awaiting calculation', code: 'INVALID_STATUS' },
    })
  }

  await touchPointAgentSeen(order.pointId)

  const updated = await prisma.order.update({
    where: { id },
    data: { updatedAt: new Date() },
  })

  return { id: updated.id, status: updated.status }
})
