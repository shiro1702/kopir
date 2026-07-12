import type { OrderBatchStatus, PaymentMethod, Prisma } from '@prisma/client'
import { PartnerBalanceEntryType } from '@prisma/client'
import { DEFAULT_COMMISSION_PERCENT } from './commission'
import { isTbankPaymentMethod } from './payments/methods'
import {
  isRequisitesComplete,
  parsePartnerRequisites,
  type PartnerRequisites,
} from './partner-requisites'
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

const PAID_BATCH_STATUSES: OrderBatchStatus[] = [
  'PAID',
  'COMPLETED',
  'PARTIALLY_FAILED',
]

/**
 * Credits the point ledger for an online payment. Partner may be linked later;
 * balance is resolved via Point.partnerId at payout time.
 */
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

  let partnerId = batch.point?.partnerId
  let commissionPercent = batch.point?.commissionPercent

  if (partnerId === undefined || commissionPercent === undefined) {
    const point = await db.point.findUnique({
      where: { id: batch.pointId },
      select: { partnerId: true, commissionPercent: true },
    })
    if (partnerId === undefined) {
      partnerId = point?.partnerId ?? null
    }
    if (commissionPercent === undefined) {
      commissionPercent = point?.commissionPercent ?? DEFAULT_COMMISSION_PERCENT
    }
  }

  const existing = await db.partnerBalanceEntry.findUnique({
    where: { batchId: batch.id },
  })
  if (existing) {
    return { credited: false, partnerKopeks: existing.amountKopeks }
  }

  const effectiveCommissionPercent = commissionPercent ?? DEFAULT_COMMISSION_PERCENT

  const { partnerKopeks } = calculatePartnerShareKopeks(
    batch.totalAmountKopeks,
    effectiveCommissionPercent,
  )
  if (partnerKopeks <= 0) {
    return { credited: false }
  }

  try {
    await db.partnerBalanceEntry.create({
      data: {
        pointId: batch.pointId,
        partnerId: partnerId ?? null,
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

/** Partner balance = credits on owned points minus payout debits. */
export async function getPartnerBalanceKopeks(
  partnerId: string,
  tx?: Prisma.TransactionClient,
): Promise<number> {
  const db = tx ?? prisma

  const [credits, payouts] = await Promise.all([
    db.partnerBalanceEntry.aggregate({
      where: {
        type: PartnerBalanceEntryType.CREDIT,
        point: { partnerId },
      },
      _sum: { amountKopeks: true },
    }),
    db.partnerBalanceEntry.aggregate({
      where: {
        type: PartnerBalanceEntryType.PAYOUT,
        partnerId,
      },
      _sum: { amountKopeks: true },
    }),
  ])

  return (credits._sum.amountKopeks ?? 0) - (payouts._sum.amountKopeks ?? 0)
}

export async function getPartnerBalanceEntries(partnerId: string, limit = 10) {
  return prisma.partnerBalanceEntry.findMany({
    where: {
      OR: [
        {
          type: PartnerBalanceEntryType.CREDIT,
          point: { partnerId },
        },
        {
          type: PartnerBalanceEntryType.PAYOUT,
          partnerId,
        },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { point: { select: { name: true } } },
  })
}

export async function getPartnerBalanceSummary(partnerId: string) {
  const [balanceKopeks, recentEntries] = await Promise.all([
    getPartnerBalanceKopeks(partnerId),
    getPartnerBalanceEntries(partnerId, 10),
  ])
  return { balanceKopeks, recentEntries }
}

export type PartnerPayoutRow = {
  partnerId: string
  name: string | null
  balanceKopeks: number
  requisites: PartnerRequisites | null
  requisitesComplete: boolean
  points: Array<{ id: string, name: string }>
}

/** Current balance (kopeks) per partner from point credits and payout debits. */
async function getPartnerBalancesMap(): Promise<Map<string, number>> {
  const partners = await prisma.partner.findMany({ select: { id: true } })
  const map = new Map<string, number>()

  await Promise.all(partners.map(async (partner) => {
    const balance = await getPartnerBalanceKopeks(partner.id)
    if (balance !== 0) {
      map.set(partner.id, balance)
    }
  }))

  return map
}

/** Partners with a positive balance, with points and requisites, for the payout registry. */
export async function listPartnersWithPositiveBalance(): Promise<PartnerPayoutRow[]> {
  const balances = await getPartnerBalancesMap()
  const partnerIds = [...balances.entries()]
    .filter(([, balance]) => balance > 0)
    .map(([id]) => id)

  if (partnerIds.length === 0) {
    return []
  }

  const partners = await prisma.partner.findMany({
    where: { id: { in: partnerIds } },
    select: {
      id: true,
      name: true,
      requisites: true,
      points: { select: { id: true, name: true }, orderBy: { name: 'asc' } },
    },
  })

  return partners
    .map((partner) => {
      const requisites = parsePartnerRequisites(partner.requisites)
      return {
        partnerId: partner.id,
        name: partner.name,
        balanceKopeks: balances.get(partner.id) ?? 0,
        requisites,
        requisitesComplete: isRequisitesComplete(requisites),
        points: partner.points,
      }
    })
    .sort((a, b) => b.balanceKopeks - a.balanceKopeks)
}

export type PartnerPayoutResult = {
  partnerId: string
  paid: boolean
  amountKopeks: number
}

/** Writes a single PAYOUT entry for the partner's full current balance. No-op when balance <= 0. */
export async function recordPartnerPayout(
  partnerId: string,
  tx?: Prisma.TransactionClient,
): Promise<PartnerPayoutResult> {
  const db = tx ?? prisma
  const balance = await getPartnerBalanceKopeks(partnerId, db)
  if (balance <= 0) {
    return { partnerId, paid: false, amountKopeks: 0 }
  }

  await db.partnerBalanceEntry.create({
    data: {
      partnerId,
      amountKopeks: balance,
      type: PartnerBalanceEntryType.PAYOUT,
    },
  })

  return { partnerId, paid: true, amountKopeks: balance }
}

/** Marks several partners as paid in one transaction. Idempotent: zero-balance partners are skipped. */
export async function recordPartnerPayouts(partnerIds: string[]): Promise<PartnerPayoutResult[]> {
  const uniqueIds = [...new Set(partnerIds)]
  if (uniqueIds.length === 0) {
    return []
  }

  return prisma.$transaction(async (tx) => {
    const results: PartnerPayoutResult[] = []
    for (const partnerId of uniqueIds) {
      results.push(await recordPartnerPayout(partnerId, tx))
    }
    return results
  })
}

export type BackfillBalanceResult = {
  scanned: number
  credited: number
  skipped: number
  totalPartnerKopeks: number
}

/** Creates missing point credits for settled T-Bank batches (idempotent via batchId unique). */
export async function backfillPointBalanceCredits(options?: {
  limit?: number
}): Promise<BackfillBalanceResult> {
  const limit = options?.limit ?? 50

  const batches = await prisma.orderBatch.findMany({
    where: {
      pointId: { not: null },
      paidAt: { not: null },
      totalAmountKopeks: { gt: 0 },
      paymentMethod: { in: ['TBANK_SBP', 'TBANK_ONLINE'] },
      status: { in: PAID_BATCH_STATUSES },
      balanceEntry: { is: null },
    },
    select: {
      id: true,
      pointId: true,
      totalAmountKopeks: true,
      paymentMethod: true,
      point: { select: { partnerId: true, commissionPercent: true } },
    },
    orderBy: { paidAt: 'asc' },
    take: limit,
  })

  let credited = 0
  let skipped = 0
  let totalPartnerKopeks = 0

  for (const batch of batches) {
    try {
      const result = await accruePartnerBalanceForBatch({
        id: batch.id,
        pointId: batch.pointId,
        totalAmountKopeks: batch.totalAmountKopeks,
        paymentMethod: batch.paymentMethod,
        point: batch.point,
      })
      if (result.credited) {
        credited += 1
        totalPartnerKopeks += result.partnerKopeks ?? 0
      } else {
        skipped += 1
      }
    } catch (error) {
      if (
        error
        && typeof error === 'object'
        && 'code' in error
        && (error as { code?: string }).code === 'P1017'
      ) {
        break
      }
      throw error
    }
  }

  return {
    scanned: batches.length,
    credited,
    skipped,
    totalPartnerKopeks,
  }
}
