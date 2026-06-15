import { assertAdminAuth } from '../../../../utils/admin-auth'
import { startOrderPrint } from '../../../../utils/order-staff-actions'

/** @deprecated Use POST /api/admin/orders/:id/print */
export default defineEventHandler(async (event) => {
  assertAdminAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      data: { error: 'Order id is required', code: 'MISSING_ORDER_ID' },
    })
  }

  return startOrderPrint(id)
})
