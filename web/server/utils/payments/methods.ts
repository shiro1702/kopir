import { PaymentMethod } from '@prisma/client'

export function isTbankPaymentMethod(method: PaymentMethod | null | undefined): boolean {
  return method === PaymentMethod.TBANK_SBP || method === PaymentMethod.TBANK_ONLINE
}

export function isTbankAcquiringEnabledMethod(method: PaymentMethod): boolean {
  return method === PaymentMethod.TBANK_SBP || method === PaymentMethod.TBANK_ONLINE
}
