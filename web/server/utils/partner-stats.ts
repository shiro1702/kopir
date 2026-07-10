import { OrderStatus } from '@prisma/client'
import { billablePages } from './order-pricing'
import { prisma } from './prisma'

export type PartnerOrdersPeriod = 'day' | 'week' | 'month'

const PAID_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PRINTING,
  OrderStatus.PRINTED,
]

function periodStart(period: PartnerOrdersPeriod): Date {
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)

  if (period === 'week') {
    const day = start.getDay()
    const diff = day === 0 ? 6 : day - 1
    start.setDate(start.getDate() - diff)
  } else if (period === 'month') {
    start.setDate(1)
  }

  return start
}

export async function getPartnerOrdersStats(
  pointId: string,
  period: PartnerOrdersPeriod,
): Promise<{ pages: number, amountKopeks: number }> {
  const since = periodStart(period)

  const orders = await prisma.order.findMany({
    where: {
      pointId,
      status: { in: PAID_STATUSES },
      paidAt: { gte: since },
    },
    select: {
      pageCount: true,
      copies: true,
      amountKopeks: true,
    },
  })

  return {
    pages: orders.reduce((sum, order) => sum + billablePages(order.pageCount, order.copies), 0),
    amountKopeks: orders.reduce((sum, order) => sum + order.amountKopeks, 0),
  }
}
