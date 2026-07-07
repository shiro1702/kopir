import { assertAdminAuth } from '../../../utils/admin-auth'
import { listPartnersWithPositiveBalance } from '../../../utils/partner-balance'

export default defineEventHandler(async (event) => {
  assertAdminAuth(event)

  const partners = await listPartnersWithPositiveBalance()
  const totalKopeks = partners.reduce((sum, p) => sum + p.balanceKopeks, 0)

  return { partners, totalKopeks }
})
