import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { calcPartnerCredit } from './partner-balance.ts'

describe('partner-balance', () => {
  it('calcPartnerCredit splits 70/30 on 10000 kopeks', () => {
    assert.equal(calcPartnerCredit(10000, 30), 7000)
  })

  it('calcPartnerCredit rounds down fractional kopeks', () => {
    assert.equal(calcPartnerCredit(100, 30), 70)
  })

  it('calcPartnerCredit returns 0 for zero amount', () => {
    assert.equal(calcPartnerCredit(0, 30), 0)
  })
})
