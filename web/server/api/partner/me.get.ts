import { getPartnerBalanceSummary } from '../../../utils/partner-balance'
import {
  isRequisitesComplete,
  parsePartnerRequisites,
} from '../../../utils/partner-requisites'
import { requirePartnerSession } from '../../../utils/partner-session'
import { prisma } from '../../../utils/prisma'
import { isPointAgentOnline } from '../../../utils/points'
import { getPartnerOrdersStats } from '../../../utils/partner-stats'

export default defineEventHandler(async (event) => {
  const partner = await requirePartnerSession(event)

  const points = await prisma.point.findMany({
    where: { partnerId: partner.id },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      slug: true,
      name: true,
      displayCode: true,
      address: true,
      isActive: true,
      pricePerPageKopeks: true,
      paymentMethodsEnabled: true,
      transferPhone: true,
      transferBankLabel: true,
      commissionPercent: true,
      lastSeenAt: true,
    },
  })

  const { balanceKopeks, recentEntries } = await getPartnerBalanceSummary(partner.id)
  const requisites = parsePartnerRequisites(partner.requisites)

  const todayStats = await Promise.all(
    points.map(async (point) => {
      const stats = await getPartnerOrdersStats(point.id, 'day')
      return { pointId: point.id, ...stats }
    }),
  )

  const todayPages = todayStats.reduce((sum, row) => sum + row.pages, 0)
  const todayAmountKopeks = todayStats.reduce((sum, row) => sum + row.amountKopeks, 0)

  return {
    partner: {
      id: partner.id,
      name: partner.name,
      offerAcceptedAt: partner.offerAcceptedAt?.toISOString() ?? null,
      createdAt: partner.createdAt.toISOString(),
      requisites,
      requisitesComplete: isRequisitesComplete(requisites),
    },
    balanceKopeks,
    recentEntries: recentEntries.map((entry) => ({
      id: entry.id,
      type: entry.type,
      amountKopeks: entry.amountKopeks,
      createdAt: entry.createdAt.toISOString(),
      pointName: entry.point?.name ?? null,
      batchId: entry.batchId,
    })),
    today: {
      pages: todayPages,
      amountKopeks: todayAmountKopeks,
    },
    points: points.map((point) => ({
      ...point,
      lastSeenAt: point.lastSeenAt?.toISOString() ?? null,
      agentOnline: isPointAgentOnline(point),
    })),
  }
})
