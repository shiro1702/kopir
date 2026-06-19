import { assertAdminAuth } from '../../utils/admin-auth'
import { paymentModeLabel } from '../../utils/bot/messages'
import { getPaymentMode } from '../../utils/payment-mode'
import { pointAgentStatusPayload } from '../../utils/points'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  assertAdminAuth(event)

  const mode = getPaymentMode()
  const points = await prisma.point.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  })

  return {
    paymentMode: mode,
    paymentModeLabel: paymentModeLabel(mode),
    staffTelegramConfigured: Boolean(useRuntimeConfig().staffTelegramChatId),
    staffMaxConfigured: Boolean(useRuntimeConfig().staffMaxUserId),
    points: points.map(pointAgentStatusPayload),
  }
})
