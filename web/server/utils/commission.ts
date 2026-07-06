import { prisma } from './prisma'

export const DEFAULT_COMMISSION_PERCENT = 15

/** Preset for tiered mode (Sprint 6). Starts near pilot 30%, converges to outreach 12%. */
export const STANDARD_COMMISSION_TIERS: CommissionTier[] = [
  { minMonthlyTurnoverKopeks: 0, platformPercent: 25 },
  { minMonthlyTurnoverKopeks: 1_000_000, platformPercent: 18 },
  { minMonthlyTurnoverKopeks: 5_000_000, platformPercent: 14 },
  { minMonthlyTurnoverKopeks: 15_000_000, platformPercent: 12 },
]

/** Sprint 6+: tiered commission by monthly paid turnover (kopeks). */
export type CommissionTier = {
  minMonthlyTurnoverKopeks: number
  platformPercent: number
}

export function parseCommissionPercent(raw: unknown): number {
  const value = Number(raw)
  if (!Number.isFinite(value) || value < 0 || value > 99) {
    throw createError({
      statusCode: 400,
      data: {
        error: 'commissionPercent must be between 0 and 99',
        code: 'INVALID_COMMISSION',
      },
    })
  }
  return Math.round(value)
}

export function partnerSharePercent(platformPercent: number): number {
  return 100 - platformPercent
}

function pickTierPercent(turnoverKopeks: number, tiers: CommissionTier[]): number {
  const sorted = [...tiers].sort(
    (a, b) => a.minMonthlyTurnoverKopeks - b.minMonthlyTurnoverKopeks,
  )
  let percent = sorted[0]?.platformPercent ?? DEFAULT_COMMISSION_PERCENT
  for (const tier of sorted) {
    if (turnoverKopeks >= tier.minMonthlyTurnoverKopeks) {
      percent = tier.platformPercent
    }
  }
  return percent
}

/**
 * Platform commission % at credit time.
 * Today: fixed `Point.commissionPercent`.
 * Sprint 6: when `commissionTiers` is set on Point, derive from current-month paid turnover.
 */
export async function resolveEffectiveCommissionPercent(pointId: string): Promise<number> {
  const point = await prisma.point.findUnique({
    where: { id: pointId },
    select: { commissionPercent: true },
  })
  if (!point) {
    return DEFAULT_COMMISSION_PERCENT
  }

  // Extension point: load commissionTiers + monthly turnover when schema adds tiered mode.
  // const tiers = point.commissionTiers as CommissionTier[] | null
  // if (tiers?.length) {
  //   const turnover = await getPointMonthlyPaidTurnoverKopeks(pointId)
  //   return pickTierPercent(turnover, tiers)
  // }

  return point.commissionPercent
}

export { pickTierPercent }
