import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  parseCommissionPercent,
  partnerSharePercent,
  pickTierPercent,
  type CommissionTier,
} from './commission.ts'

describe('commission', () => {
  it('parseCommissionPercent accepts 0-99', () => {
    assert.equal(parseCommissionPercent(30), 30)
    assert.equal(parseCommissionPercent(0), 0)
    assert.equal(parseCommissionPercent(99), 99)
  })

  it('partnerSharePercent complements platform share', () => {
    assert.equal(partnerSharePercent(30), 70)
    assert.equal(partnerSharePercent(12), 88)
  })

  it('pickTierPercent selects tier by monthly turnover', () => {
    const tiers: CommissionTier[] = [
      { minMonthlyTurnoverKopeks: 0, platformPercent: 15 },
      { minMonthlyTurnoverKopeks: 500_000, platformPercent: 12 },
      { minMonthlyTurnoverKopeks: 5_000_000, platformPercent: 8 },
    ]
    assert.equal(pickTierPercent(0, tiers), 15)
    assert.equal(pickTierPercent(499_999, tiers), 15)
    assert.equal(pickTierPercent(500_000, tiers), 12)
    assert.equal(pickTierPercent(5_000_000, tiers), 8)
  })
})
