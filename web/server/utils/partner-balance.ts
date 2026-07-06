import type { PaymentMethod, Prisma } from '@prisma/client'
import { PartnerBalanceEntryType } from '@prisma/client'
import { DEFAULT_COMMISSION_PERCENT } from './commission'
import { isTbankPaymentMethod } from './payments/methods'
import { prisma } from './prisma'

export type PartnerShareSplit = {
  partnerKopeks: number
  platformKopeks: number
}

export function calculatePartnerShareKopeks(
  totalAmountKopeks: number,
  commissionPercent: number,
): PartnerShareSplit {
  if (totalAmountKopeks < 0) {
    throw new Error('totalAmountKopeks must be non-negative')
  }
  if (commissionPercent < 0 || commissionPercent > 100) {
    throw new Error('commissionPercent must be between 0 and 100')
  }

  const partnerKopeks = Math.floor(totalAmountKopeks * (100 - commissionPercent) / 100)
  return {
    partnerKopeks,
    platformKopeks: totalAmountKopeks - partnerKopeks,
  }
}

/** @deprecated Use calculatePartnerShareKopeks().partnerKopeks */
export function calcPartnerCredit(amountKopeks: number, commissionPercent: number): number {
  return calculatePartnerShareKopeks(amountKopeks, commissionPercent).partnerKopeks
}

export type AccrueBatchInput = {
  id: string
  pointId: string | null
  totalAmountKopeks: number
  paymentMethod: PaymentMethod | null
  point?: {
    partnerId: string | null
    commissionPercent: number
  } | null
}

export async function accruePartnerBalanceForBatch(
  batch: AccrueBatchInput,
  tx?: Prisma.TransactionClient,
): Promise<{ credited: boolean, partnerKopeks?: number }> {
  if (!isTbankPaymentMethod(batch.paymentMethod)) {
    return { credited: false }
  }
  if (!batch.pointId || batch.totalAmountKopeks <= 0) {
    return { credited: false }
  }

  const db = tx ?? prisma

  const partnerId = batch.point?.partnerId ?? (
    await db.point.findUnique({
      where: { id: batch.pointId },
      select: { partnerId: true },
    })
  )?.partnerId

  if (!partnerId) {
    console.warn('[partner-balance] skip accrual: point has no partner', {
      batchId: batch.id,
      pointId: batch.pointId,
    })
    return { credited: false }
  }

  const existing = await db.partnerBalanceEntry.findUnique({
    where: { batchId: batch.id },
  })
  if (existing) {
    return { credited: false, partnerKopeks: existing.amountKopeks }
  }

  const commissionPercent = batch.point?.commissionPercent ?? (
    await db.point.findUnique({
      where: { id: batch.pointId },
      select: { commissionPercent: true },
    })
  )?.commissionPercent ?? DEFAULT_COMMISSION_PERCENT

  const { partnerKopeks } = calculatePartnerShareKopeks(batch.totalAmountKopeks, commissionPercent)
  if (partnerKopeks <= 0) {
    return { credited: false }
  }

  try {
    await db.partnerBalanceEntry.create({
      data: {
        partnerId,
        amountKopeks: partnerKopeks,
        type: PartnerBalanceEntryType.CREDIT,
        batchId: batch.id,
      },
    })
  } catch (error) {
    if (
      error
      && typeof error === 'object'
      && 'code' in error
      && (error as { code?: string }).code === 'P2002'
    ) {
      return { credited: false }
    }
    throw error
  }

  return { credited: true, partnerKopeks }
}

/** @deprecated Use accruePartnerBalanceForBatch */
export async function creditPartnerBalanceForBatch(batch: AccrueBatchInput): Promise<void> {
  await accruePartnerBalanceForBatch(batch)
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

export async function getPartnerBalanceSummary(partnerId: string) {
  const [balanceKopeks, recentEntries] = await Promise.all([
    getPartnerBalanceKopeks(partnerId),
    getPartnerBalanceEntries(partnerId, 10),
  ])
  return { balanceKopeks, recentEntries }
}
