import { PaymentMethod } from '@prisma/client'
import { assertAdminAuth } from '../../../utils/admin-auth'
import { parseCommissionPercent } from '../../../utils/commission'
import { serializePointForAdmin, validatePointSlug } from '../../../utils/bind-tokens'
import { prisma } from '../../../utils/prisma'

const VALID_METHODS = new Set<string>(Object.values(PaymentMethod))

function parsePaymentMethods(raw: unknown): PaymentMethod[] | undefined {
  if (raw === undefined) {
    return undefined
  }
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

export default defineEventHandler(async (event) => {
  assertAdminAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      data: { error: 'Point id is required', code: 'ID_REQUIRED' },
    })
  }

  const existing = await prisma.point.findUnique({ where: { id } })
  if (!existing) {
    throw createError({
      statusCode: 404,
      data: { error: 'Point not found', code: 'NOT_FOUND' },
    })
  }

  const body = await readBody(event)
  const data: {
    name?: string
    slug?: string
    isActive?: boolean
    pricePerPageKopeks?: number
    paymentMethodsEnabled?: PaymentMethod[]
    transferPhone?: string | null
    transferBankLabel?: string | null
    displayCode?: string | null
    commissionPercent?: number
  } = {}

  if (body?.name !== undefined) {
    const name = String(body.name).trim()
    if (!name) {
      throw createError({
        statusCode: 400,
        data: { error: 'name cannot be empty', code: 'INVALID_NAME' },
      })
    }
    data.name = name
  }

  if (body?.slug !== undefined) {
    const slug = validatePointSlug(String(body.slug))
    if (slug !== existing.slug) {
      const conflict = await prisma.point.findUnique({ where: { slug } })
      if (conflict) {
        throw createError({
          statusCode: 409,
          data: { error: `Point with slug "${slug}" already exists`, code: 'SLUG_EXISTS' },
        })
      }
    }
    data.slug = slug
  }

  if (body?.isActive !== undefined) {
    data.isActive = Boolean(body.isActive)
  }

  if (body?.pricePerPageKopeks !== undefined) {
    const value = Number(body.pricePerPageKopeks)
    if (!Number.isFinite(value) || value <= 0) {
      throw createError({
        statusCode: 400,
        data: { error: 'pricePerPageKopeks must be positive', code: 'INVALID_PRICE' },
      })
    }
    data.pricePerPageKopeks = Math.round(value)
  }

  if (body?.commissionPercent !== undefined) {
    data.commissionPercent = parseCommissionPercent(body.commissionPercent)
  }

  const methods = parsePaymentMethods(body?.paymentMethodsEnabled)
  if (methods) {
    data.paymentMethodsEnabled = methods
  }

  if (body?.transferPhone !== undefined) {
    data.transferPhone = body.transferPhone ? String(body.transferPhone).trim() : null
  }

  if (body?.transferBankLabel !== undefined) {
    data.transferBankLabel = body.transferBankLabel ? String(body.transferBankLabel).trim() : null
  }

  if (body?.displayCode !== undefined) {
    const displayCode = body.displayCode ? String(body.displayCode).trim() : null
    if (displayCode) {
      const codeConflict = await prisma.point.findFirst({
        where: { displayCode, NOT: { id } },
      })
      if (codeConflict) {
        throw createError({
          statusCode: 409,
          data: { error: `Point with code "${displayCode}" already exists`, code: 'DISPLAY_CODE_EXISTS' },
        })
      }
    }
    data.displayCode = displayCode
  }

  const isActive = data.isActive ?? existing.isActive
  const methodsFinal = data.paymentMethodsEnabled ?? existing.paymentMethodsEnabled
  if (isActive && methodsFinal.length === 0) {
    throw createError({
      statusCode: 400,
      data: { error: 'Active point must have at least one payment method', code: 'NO_PAYMENT_METHODS' },
    })
  }

  const point = await prisma.point.update({
    where: { id },
    data,
  })

  return { point: serializePointForAdmin(point) }
})
