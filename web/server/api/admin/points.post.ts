import { PaymentMethod } from '@prisma/client'
import { assertAdminAuth } from '../../utils/admin-auth'
import { parseCommissionPercent } from '../../utils/commission'
import { serializePointForAdmin, validatePointSlug } from '../../utils/bind-tokens'
import { parsePointContentFields } from '../../utils/point-admin-fields'
import { prisma } from '../../utils/prisma'

const VALID_METHODS = new Set<string>(Object.values(PaymentMethod))

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

function parsePrice(raw: unknown): number {
  const value = Number(raw)
  if (!Number.isFinite(value) || value <= 0) {
    throw createError({
      statusCode: 400,
      data: { error: 'pricePerPageKopeks must be a positive number', code: 'INVALID_PRICE' },
    })
  }
  return Math.round(value)
}

export default defineEventHandler(async (event) => {
  assertAdminAuth(event)

  const body = await readBody(event)
  const name = String(body?.name ?? '').trim()
  const slug = validatePointSlug(String(body?.slug ?? ''))
  const pricePerPageKopeks = parsePrice(body?.pricePerPageKopeks ?? 1000)
  const paymentMethodsEnabled = parsePaymentMethods(body?.paymentMethodsEnabled)
  const transferPhone = body?.transferPhone ? String(body.transferPhone).trim() : null
  const transferBankLabel = body?.transferBankLabel ? String(body.transferBankLabel).trim() : null
  const displayCode = body?.displayCode ? String(body.displayCode).trim() : null
  const visibleInList = body?.visibleInList !== undefined ? Boolean(body.visibleInList) : false
  const commissionPercent = body?.commissionPercent !== undefined
    ? parseCommissionPercent(body.commissionPercent)
    : undefined

  if (!name) {
    throw createError({
      statusCode: 400,
      data: { error: 'name is required', code: 'NAME_REQUIRED' },
    })
  }

  const existing = await prisma.point.findUnique({ where: { slug } })
  if (existing) {
    throw createError({
      statusCode: 409,
      data: { error: `Point with slug "${slug}" already exists`, code: 'SLUG_EXISTS' },
    })
  }

  if (displayCode) {
    const codeConflict = await prisma.point.findUnique({ where: { displayCode } })
    if (codeConflict) {
      throw createError({
        statusCode: 409,
        data: { error: `Point with code "${displayCode}" already exists`, code: 'DISPLAY_CODE_EXISTS' },
      })
    }
  }

  const contentFields = parsePointContentFields(body ?? {})

  const point = await prisma.point.create({
    data: {
      name,
      slug,
      displayCode,
      pricePerPageKopeks,
      paymentMethodsEnabled,
      transferPhone: transferPhone || null,
      transferBankLabel: transferBankLabel || null,
      visibleInList,
      ...(commissionPercent !== undefined ? { commissionPercent } : {}),
      ...(contentFields.citySlug !== undefined ? { citySlug: contentFields.citySlug } : {}),
      ...(contentFields.address !== undefined ? { address: contentFields.address } : {}),
      ...(contentFields.lat !== undefined ? { lat: contentFields.lat } : {}),
      ...(contentFields.lng !== undefined ? { lng: contentFields.lng } : {}),
      ...(contentFields.timezone !== undefined ? { timezone: contentFields.timezone } : {}),
      ...(contentFields.openingHours !== undefined ? { openingHours: contentFields.openingHours } : {}),
      ...(contentFields.acceptsOnlineOrders !== undefined
        ? { acceptsOnlineOrders: contentFields.acceptsOnlineOrders }
        : {}),
      ...(contentFields.pickupInstructions !== undefined
        ? { pickupInstructions: contentFields.pickupInstructions }
        : {}),
      ...(contentFields.estimatedReadyMinutes !== undefined
        ? { estimatedReadyMinutes: contentFields.estimatedReadyMinutes }
        : {}),
      ...(contentFields.entryPhotoUrl !== undefined ? { entryPhotoUrl: contentFields.entryPhotoUrl } : {}),
    },
  })

  return { point: serializePointForAdmin(point) }
})
