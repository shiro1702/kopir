import {
  isRequisitesComplete,
  parsePartnerRequisites,
  validatePartnerRequisites,
} from '../../../utils/partner-requisites'
import { requirePartnerSession } from '../../../utils/partner-session'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const partner = await requirePartnerSession(event)
  const body = await readBody(event)
  const requisites = validatePartnerRequisites(body ?? {})

  const updated = await prisma.partner.update({
    where: { id: partner.id },
    data: {
      requisites,
      name: partner.name || requisites.legalName,
    },
  })

  const parsed = parsePartnerRequisites(updated.requisites)
  return {
    requisites: parsed,
    requisitesComplete: isRequisitesComplete(parsed),
  }
})
