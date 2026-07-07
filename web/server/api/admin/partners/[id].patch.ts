import { assertAdminAuth } from '../../../utils/admin-auth'
import { validatePartnerRequisites } from '../../../utils/partner-requisites'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  assertAdminAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      data: { error: 'Partner id is required', code: 'ID_REQUIRED' },
    })
  }

  const existing = await prisma.partner.findUnique({ where: { id } })
  if (!existing) {
    throw createError({
      statusCode: 404,
      data: { error: 'Partner not found', code: 'NOT_FOUND' },
    })
  }

  const body = await readBody(event)
  const data: { name?: string | null, requisites?: ReturnType<typeof validatePartnerRequisites> } = {}

  if (body?.name !== undefined) {
    data.name = body.name ? String(body.name).trim() : null
  }

  if (body?.requisites !== undefined) {
    data.requisites = validatePartnerRequisites(body.requisites ?? {})
  }

  const partner = await prisma.partner.update({
    where: { id },
    data,
  })

  return {
    partner: {
      id: partner.id,
      name: partner.name,
      requisites: partner.requisites,
    },
  }
})
