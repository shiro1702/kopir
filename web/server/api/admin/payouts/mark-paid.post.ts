import { assertAdminAuth } from '../../../utils/admin-auth'
import { recordPartnerPayouts } from '../../../utils/partner-balance'

export default defineEventHandler(async (event) => {
  assertAdminAuth(event)

  const body = await readBody(event)
  const partnerIds = Array.isArray(body?.partnerIds)
    ? body.partnerIds.map((id: unknown) => String(id)).filter(Boolean)
    : []

  if (partnerIds.length === 0) {
    throw createError({
      statusCode: 400,
      data: { error: 'partnerIds must be a non-empty array', code: 'NO_PARTNERS' },
    })
  }

  const results = await recordPartnerPayouts(partnerIds)
  const paidKopeks = results.reduce((sum, r) => sum + r.amountKopeks, 0)

  return { results, paidKopeks }
})
