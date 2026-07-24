import { PaymentMethod } from '@prisma/client'
import {
  PARTNER_MANAGEABLE_PAYMENT_METHODS,
  PARTNER_RESTRICTED_PAYMENT_METHODS,
} from '../../../../utils/bot/partner-keyboards'
import {
  assertPartnerOwnsPointById,
  requirePartnerSession,
} from '../../../../utils/partner-session'
import { updatePointSettings } from '../../../../utils/point-settings'
import { isPointAgentOnline } from '../../../../utils/points'
import { prisma } from '../../../../utils/prisma'

type PatchBody = {
  pricePerPageKopeks?: number
  paymentMethodsEnabled?: string[]
}

export default defineEventHandler(async (event) => {
  const partner = await requirePartnerSession(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      data: { error: 'Point id is required', code: 'ID_REQUIRED' },
    })
  }

  await assertPartnerOwnsPointById(partner.id, id)

  const existing = await prisma.point.findUnique({ where: { id } })
  if (!existing) {
    throw createError({
      statusCode: 404,
      data: { error: 'Point not found', code: 'NOT_FOUND' },
    })
  }

  const body = await readBody<PatchBody>(event)
  const patch: {
    pricePerPageKopeks?: number
    paymentMethodsEnabled?: PaymentMethod[]
  } = {}

  if (body.pricePerPageKopeks !== undefined) {
    patch.pricePerPageKopeks = body.pricePerPageKopeks
  }

  if (body.paymentMethodsEnabled !== undefined) {
    if (!Array.isArray(body.paymentMethodsEnabled)) {
      throw createError({
        statusCode: 400,
        data: { error: 'paymentMethodsEnabled must be an array', code: 'INVALID_PAYMENT_METHODS' },
      })
    }

    const requested = body.paymentMethodsEnabled.map(
      (m) => String(m).trim().toUpperCase(),
    ) as PaymentMethod[]

    for (const method of requested) {
      if (!PARTNER_MANAGEABLE_PAYMENT_METHODS.includes(method)) {
        throw createError({
          statusCode: 400,
          data: {
            error: 'Можно менять только онлайн-оплату Т-Банка',
            code: 'PAYMENT_METHOD_RESTRICTED',
          },
        })
      }
    }

    const preserved = existing.paymentMethodsEnabled.filter((m) =>
      PARTNER_RESTRICTED_PAYMENT_METHODS.includes(m),
    )
    const merged = [...preserved]
    for (const method of requested) {
      if (!merged.includes(method)) {
        merged.push(method)
      }
    }
    patch.paymentMethodsEnabled = merged
  }

  const point = await updatePointSettings(id, patch)

  return {
    point: {
      id: point.id,
      slug: point.slug,
      name: point.name,
      pricePerPageKopeks: point.pricePerPageKopeks,
      paymentMethodsEnabled: point.paymentMethodsEnabled,
      transferPhone: point.transferPhone,
      transferBankLabel: point.transferBankLabel,
      agentOnline: isPointAgentOnline(point),
      lastSeenAt: point.lastSeenAt?.toISOString() ?? null,
    },
  }
})
