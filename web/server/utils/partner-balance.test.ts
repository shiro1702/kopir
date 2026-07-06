import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  calcPartnerCredit,
  calculatePartnerShareKopeks,
} from './partner-balance.ts'

describe('partner-balance split', () => {
  it('calculatePartnerShareKopeks splits 70/30 on 10000 kopeks', () => {
    const split = calculatePartnerShareKopeks(10_000, 30)
    assert.equal(split.partnerKopeks, 7000)
    assert.equal(split.platformKopeks, 3000)
  })

  it('calculatePartnerShareKopeks gives platform remainder on 1 kopek', () => {
    const split = calculatePartnerShareKopeks(1, 30)
    assert.equal(split.partnerKopeks, 0)
    assert.equal(split.platformKopeks, 1)
  })

  it('calculatePartnerShareKopeks splits 999 kopeks at 30%', () => {
    const split = calculatePartnerShareKopeks(999, 30)
    assert.equal(split.partnerKopeks, 699)
    assert.equal(split.platformKopeks, 300)
  })

  it('calculatePartnerShareKopeks gives full amount to partner at 0% commission', () => {
    const split = calculatePartnerShareKopeks(10_000, 0)
    assert.equal(split.partnerKopeks, 10_000)
    assert.equal(split.platformKopeks, 0)
  })

  it('calculatePartnerShareKopeks gives full amount to platform at 100% commission', () => {
    const split = calculatePartnerShareKopeks(10_000, 100)
    assert.equal(split.partnerKopeks, 0)
    assert.equal(split.platformKopeks, 10_000)
  })

  it('calcPartnerCredit matches partnerKopeks from calculatePartnerShareKopeks', () => {
    assert.equal(calcPartnerCredit(10_000, 30), 7000)
    assert.equal(calcPartnerCredit(100, 30), 70)
    assert.equal(calcPartnerCredit(0, 30), 0)
  })
})
