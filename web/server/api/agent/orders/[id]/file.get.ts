import { OrderStatus } from '@prisma/client'
import { assertAgentAuth } from '../../../../utils/agent-auth'
import { downloadOrderFile } from '../../../../utils/blob'
import { prisma } from '../../../../utils/prisma'

const DOWNLOADABLE_STATUSES = new Set<OrderStatus>([
  OrderStatus.CALCULATING,
  OrderStatus.PAID,
  OrderStatus.PRINTING,
])

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

  if (!DOWNLOADABLE_STATUSES.has(order.status)) {
    throw createError({
      statusCode: 400,
      data: { error: 'Order is not available for download', code: 'INVALID_STATUS' },
    })
  }

  const buffer = await downloadOrderFile(order.filePath)
  const contentType = order.mimeType || 'application/octet-stream'

  setHeader(event, 'Content-Type', contentType)
  setHeader(event, 'Content-Disposition', `attachment; filename="${order.fileName}"`)
  return buffer
})
