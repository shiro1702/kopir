import { assertAdminAuth } from '../../utils/admin-auth'
import { paymentModeLabel } from '../../utils/bot/messages'
import { getPaymentMode } from '../../utils/payment-mode'

export default defineEventHandler((event) => {
  assertAdminAuth(event)

  const mode = getPaymentMode()
  return {
    paymentMode: mode,
    paymentModeLabel: paymentModeLabel(mode),
    staffTelegramConfigured: Boolean(useRuntimeConfig().staffTelegramChatId),
    staffMaxConfigured: Boolean(useRuntimeConfig().staffMaxUserId),
  }
})
