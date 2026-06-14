import { assertAdminAuth } from '../../../../utils/admin-auth'
import { confirmOrderPayment } from '../../../../utils/order-staff-actions'

export default defineEventHandler(async (event) => {
  assertAdminAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      data: { error: 'Order id is required', code: 'MISSING_ORDER_ID' },
    })
  }

  return confirmOrderPayment(id)
})
