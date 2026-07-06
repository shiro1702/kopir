import type { PaymentMethod } from '@prisma/client'
import { PartnerBalanceEntryType } from '@prisma/client'
import { isTbankPaymentMethod } from './payments/methods'
import { resolveEffectiveCommissionPercent } from './commission'
import { prisma } from './prisma'

export function calcPartnerCredit(amountKopeks: number, commissionPercent: number): number {
  const partnerPercent = 100 - commissionPercent
  return Math.floor(amountKopeks * partnerPercent / 100)
}

export async function getPartnerBalanceKopeks(partnerId: string): Promise<number> {
  const entries = await prisma.partnerBalanceEntry.groupBy({
    by: ['type'],
    where: { partnerId },
    _sum: { amountKopeks: true },
  })

  let balance = 0
  for (const row of entries) {
    const sum = row._sum.amountKopeks ?? 0
    if (row.type === PartnerBalanceEntryType.CREDIT) {
      balance += sum
    } else {
      balance -= sum
    }
  }
  return balance
}

export async function getPartnerBalanceEntries(partnerId: string, limit = 10) {
  return prisma.partnerBalanceEntry.findMany({
    where: { partnerId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

export async function creditPartnerBalanceForBatch(batch: {
  id: string
  pointId: string | null
  totalAmountKopeks: number
  paymentMethod: PaymentMethod | null
}): Promise<void> {
  if (!isTbankPaymentMethod(batch.paymentMethod)) {
    return
  }
  if (!batch.pointId || batch.totalAmountKopeks <= 0) {
    return
  }

  const point = await prisma.point.findUnique({
    where: { id: batch.pointId },
    select: { partnerId: true },
  })
  if (!point?.partnerId) {
    return
  }

  const existing = await prisma.partnerBalanceEntry.findUnique({
    where: { batchId: batch.id },
  })
  if (existing) {
    return
  }

  const commissionPercent = await resolveEffectiveCommissionPercent(batch.pointId)
  const amountKopeks = calcPartnerCredit(batch.totalAmountKopeks, commissionPercent)
  if (amountKopeks <= 0) {
    return
  }

  await prisma.partnerBalanceEntry.create({
    data: {
      partnerId: point.partnerId,
      amountKopeks,
      type: PartnerBalanceEntryType.CREDIT,
      batchId: batch.id,
    },
  })
}
