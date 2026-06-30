import { assertAdminAuth } from '../../utils/admin-auth'
import { resolveTelegramBotUsernameForAdmin } from '../../utils/bind-tokens'
import { paymentModeLabel } from '../../utils/bot/messages'
import { getPaymentMode } from '../../utils/payment-mode'
import { pointAgentStatusPayload } from '../../utils/points'
import { isTbankConfigured } from '../../utils/tbank-config'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  assertAdminAuth(event)

  const mode = getPaymentMode()
  const points = await prisma.point.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  })

  const config = useRuntimeConfig()
  const telegramBotUsername = await resolveTelegramBotUsernameForAdmin()

  return {
    paymentMode: mode,
    paymentModeLabel: paymentModeLabel(mode),
    staffTelegramConfigured: Boolean(config.staffTelegramChatId),
    staffMaxConfigured: Boolean(config.staffMaxUserId),
    tbankConfigured: isTbankConfigured(),
    telegramConfigured: Boolean(config.telegramBotToken),
    telegramBotUsername,
    maxConfigured: Boolean(config.maxBotToken),
    points: points.map(pointAgentStatusPayload),
  }
})
