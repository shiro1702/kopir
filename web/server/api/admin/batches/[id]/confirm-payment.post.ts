import { assertAdminAuth } from '../../../../utils/admin-auth'
import { confirmBatchPayment } from '../../../../utils/batch'

export default defineEventHandler(async (event) => {
  assertAdminAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      data: { error: 'Batch id is required', code: 'MISSING_BATCH_ID' },
    })
  }

  return confirmBatchPayment(id)
})
