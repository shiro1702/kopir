import { assertAdminAuth } from '../../../../utils/admin-auth'
import { refundTbankPaymentForOrder } from '../../../../utils/payments/providers/tbank-acquiring'

export default defineEventHandler(async (event) => {
  assertAdminAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      data: { error: 'Order id is required', code: 'MISSING_ORDER_ID' },
    })
  }

  return refundTbankPaymentForOrder(id)
})
