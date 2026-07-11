import { assertAdminAuth } from '../../../../utils/admin-auth'
import { downloadOrderFile } from '../../../../utils/blob'
import { contentDispositionAttachment } from '../../../../utils/file-types'
import { prisma } from '../../../../utils/prisma'

export default defineEventHandler(async (event) => {
  assertAdminAuth(event)

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

  if (!order.filePath?.trim()) {
    throw createError({
      statusCode: 404,
      data: { error: 'File is not available', code: 'FILE_NOT_AVAILABLE' },
    })
  }

  const buffer = await downloadOrderFile(order.filePath)
  const contentType = order.mimeType || 'application/octet-stream'

  setHeader(event, 'Content-Type', contentType)
  setHeader(event, 'Content-Disposition', contentDispositionAttachment(order.fileName))
  return buffer
})
