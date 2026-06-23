import type { PaymentMethod, Point } from '@prisma/client'

type PointTransferFields = Pick<Point, 'transferPhone' | 'transferBankLabel'>

export function getTransferPhone(point: PointTransferFields): string | null {
  const fromPoint = point.transferPhone?.trim()
  if (fromPoint) {
    return fromPoint
  }
  const config = useRuntimeConfig()
  const fromEnv = String(config.pointTransferPhone ?? '').trim()
  return fromEnv || null
}

export function getTransferBankLabel(point: PointTransferFields): string | null {
  const fromPoint = point.transferBankLabel?.trim()
  if (fromPoint) {
    return fromPoint
  }
  const config = useRuntimeConfig()
  const fromEnv = String(config.pointTransferBankLabel ?? '').trim()
  return fromEnv || null
}

function parseEnabledMethods(raw: string): PaymentMethod[] {
  const methods: PaymentMethod[] = []
  for (const part of raw.split(',')) {
    const value = part.trim().toUpperCase()
    if (value === 'SBP_TRANSFER' || value === 'ON_SITE') {
      methods.push(value)
    }
  }
  return methods
}

export function getEnabledPaymentMethods(point: PointTransferFields): PaymentMethod[] {
  const config = useRuntimeConfig()
  const raw = String(config.paymentMethodsEnabled ?? 'SBP_TRANSFER,ON_SITE')
  const methods = parseEnabledMethods(raw)

  const result: PaymentMethod[] = []
  for (const method of methods) {
    if (method === 'SBP_TRANSFER' && !getTransferPhone(point)) {
      continue
    }
    if (!result.includes(method)) {
      result.push(method)
    }
  }
  return result
}

export function maskTransferPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length >= 10) {
    const lastTwo = digits.slice(-2)
    return `+7 *** ***-**-${lastTwo}`
  }
  return '***'
}
