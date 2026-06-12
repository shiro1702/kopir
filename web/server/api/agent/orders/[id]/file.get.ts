import { OrderStatus } from '@prisma/client'
import { assertAgentAuth } from '../../../../utils/agent-auth'
import { downloadOrderPdf } from '../../../../utils/blob'
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

  if (order.status !== OrderStatus.PAID && order.status !== OrderStatus.PRINTING) {
    throw createError({
      statusCode: 400,
      data: { error: 'Order is not available for download', code: 'INVALID_STATUS' },
    })
  }

  const buffer = await downloadOrderPdf(order.filePath)

  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `attachment; filename="${order.fileName}"`)
  return buffer
})
