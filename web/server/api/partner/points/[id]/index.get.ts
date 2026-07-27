import {
  assertPartnerOwnsPointById,
  requirePartnerSession,
} from '../../../utils/partner-session'
import { getPartnerOrdersStats, type PartnerOrdersPeriod } from '../../../utils/partner-stats'
import { prisma } from '../../../utils/prisma'
import { isPointAgentOnline } from '../../../utils/points'
import { buildPointClientLinksForSlug } from '../../../utils/point-links'

const PERIODS = new Set<PartnerOrdersPeriod>(['day', 'week', 'month'])

export default defineEventHandler(async (event) => {
  const partner = await requirePartnerSession(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      data: { error: 'Point id is required', code: 'ID_REQUIRED' },
    })
  }

  await assertPartnerOwnsPointById(partner.id, id)

  const point = await prisma.point.findUnique({ where: { id } })
  if (!point) {
    throw createError({
      statusCode: 404,
      data: { error: 'Point not found', code: 'NOT_FOUND' },
    })
  }

  const periodRaw = String(getQuery(event).period ?? 'day')
  const period: PartnerOrdersPeriod = PERIODS.has(periodRaw as PartnerOrdersPeriod)
    ? (periodRaw as PartnerOrdersPeriod)
    : 'day'

  const [stats, links] = await Promise.all([
    getPartnerOrdersStats(point.id, period),
    buildPointClientLinksForSlug(point.slug),
  ])

  return {
    point: {
      id: point.id,
      slug: point.slug,
      name: point.name,
      displayCode: point.displayCode,
      address: point.address,
      citySlug: point.citySlug,
      isActive: point.isActive,
      pricePerPageKopeks: point.pricePerPageKopeks,
      paymentMethodsEnabled: point.paymentMethodsEnabled,
      transferPhone: point.transferPhone,
      transferBankLabel: point.transferBankLabel,
      commissionPercent: point.commissionPercent,
      lastSeenAt: point.lastSeenAt?.toISOString() ?? null,
      agentOnline: isPointAgentOnline(point),
    },
    stats: {
      period,
      pages: stats.pages,
      amountKopeks: stats.amountKopeks,
    },
    links: {
      telegramUrl: links.telegramDeepLink,
      maxUrl: links.maxDeepLink,
      goUrl: links.goLink,
    },
  }
})
