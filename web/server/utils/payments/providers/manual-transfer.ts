import { PaymentMethod } from '@prisma/client'
import type { PaymentProvider } from '../types'

export const manualTransferProvider: PaymentProvider = {
  method: PaymentMethod.SBP_TRANSFER,
  staffNotifyTrigger: 'on_client_claimed',
}
