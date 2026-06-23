import { PaymentMethod } from '@prisma/client'
import type { PaymentProvider } from '../types'

export const manualOnSiteProvider: PaymentProvider = {
  method: PaymentMethod.ON_SITE,
  staffNotifyTrigger: 'on_method_selected',
}
