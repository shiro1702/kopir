import type { PaymentMethod, Point } from '@prisma/client'
import { isTbankConfigured } from './tbank-config'

type PointTransferFields = Pick<Point, 'transferPhone' | 'transferBankLabel' | 'paymentMethodsEnabled'>

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

function parseEnabledMethodsFromEnv(raw: string): PaymentMethod[] {
  const methods: PaymentMethod[] = []
  for (const part of raw.split(',')) {
    const value = part.trim().toUpperCase()
    if (value === 'SBP_TRANSFER' || value === 'ON_SITE' || value === 'TBANK_ONLINE') {
      methods.push(value)
    }
  }
  return methods
}

function getPointOrEnvMethods(point: PointTransferFields): PaymentMethod[] {
  if (point.paymentMethodsEnabled?.length) {
    return [...point.paymentMethodsEnabled]
  }
  const config = useRuntimeConfig()
  const raw = String(config.paymentMethodsEnabled ?? 'SBP_TRANSFER,ON_SITE')
  return parseEnabledMethodsFromEnv(raw)
}

export function getEnabledPaymentMethods(point: PointTransferFields): PaymentMethod[] {
  const methods = getPointOrEnvMethods(point)
  const result: PaymentMethod[] = []

  for (const method of methods) {
    if (method === 'SBP_TRANSFER' && !getTransferPhone(point)) {
      continue
    }
    if (method === 'TBANK_ONLINE' && !isTbankConfigured()) {
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
