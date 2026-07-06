import { PaymentMethod } from '@prisma/client'
import type { Point } from '@prisma/client'
import { prisma } from './prisma'

const VALID_METHODS = new Set<string>(Object.values(PaymentMethod))

export type PointSettingsPatch = {
  pricePerPageKopeks?: number
  paymentMethodsEnabled?: PaymentMethod[]
  transferPhone?: string | null
  transferBankLabel?: string | null
}

function parsePaymentMethods(raw: unknown): PaymentMethod[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw createError({
      statusCode: 400,
      data: { error: 'paymentMethodsEnabled must be a non-empty array', code: 'INVALID_PAYMENT_METHODS' },
    })
  }
  const methods: PaymentMethod[] = []
  for (const item of raw) {
    const value = String(item).trim().toUpperCase()
    if (!VALID_METHODS.has(value)) {
      throw createError({
        statusCode: 400,
        data: { error: `Invalid payment method: ${item}`, code: 'INVALID_PAYMENT_METHOD' },
      })
    }
    if (!methods.includes(value as PaymentMethod)) {
      methods.push(value as PaymentMethod)
    }
  }
  return methods
}

export async function updatePointSettings(
  pointId: string,
  patch: PointSettingsPatch,
): Promise<Point> {
  const existing = await prisma.point.findUnique({ where: { id: pointId } })
  if (!existing) {
    throw createError({
      statusCode: 404,
      data: { error: 'Point not found', code: 'NOT_FOUND' },
    })
  }

  const data: PointSettingsPatch = {}

  if (patch.pricePerPageKopeks !== undefined) {
    const value = Number(patch.pricePerPageKopeks)
    if (!Number.isFinite(value) || value <= 0) {
      throw createError({
        statusCode: 400,
        data: { error: 'pricePerPageKopeks must be positive', code: 'INVALID_PRICE' },
      })
    }
    data.pricePerPageKopeks = Math.round(value)
  }

  if (patch.paymentMethodsEnabled !== undefined) {
    data.paymentMethodsEnabled = parsePaymentMethods(patch.paymentMethodsEnabled)
  }

  if (patch.transferPhone !== undefined) {
    data.transferPhone = patch.transferPhone ? String(patch.transferPhone).trim() : null
  }

  if (patch.transferBankLabel !== undefined) {
    data.transferBankLabel = patch.transferBankLabel ? String(patch.transferBankLabel).trim() : null
  }

  const isActive = existing.isActive
  const methodsFinal = data.paymentMethodsEnabled ?? existing.paymentMethodsEnabled
  if (isActive && methodsFinal.length === 0) {
    throw createError({
      statusCode: 400,
      data: { error: 'Active point must have at least one payment method', code: 'NO_PAYMENT_METHODS' },
    })
  }

  return prisma.point.update({
    where: { id: pointId },
    data,
  })
}
