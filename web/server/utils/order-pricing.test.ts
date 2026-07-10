import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  billablePages,
  clampCopies,
  computeOrderAmountKopeks,
  formatPagesWithCopies,
  ORDER_COPIES_MAX,
  ORDER_COPIES_MIN,
} from './order-pricing'

describe('order-pricing', () => {
  it('clampCopies enforces bounds', () => {
    assert.equal(clampCopies(0), ORDER_COPIES_MIN)
    assert.equal(clampCopies(-3), ORDER_COPIES_MIN)
    assert.equal(clampCopies(10), 10)
    assert.equal(clampCopies(99), ORDER_COPIES_MAX)
    assert.equal(clampCopies(2.7), 3)
  })

  it('billablePages multiplies pageCount by copies', () => {
    assert.equal(billablePages(5, 1), 5)
    assert.equal(billablePages(5, 3), 15)
    assert.equal(billablePages(5, 99), 50)
  })

  it('computeOrderAmountKopeks uses billable pages', () => {
    assert.equal(computeOrderAmountKopeks(4, 2, 1000), 8000)
    assert.equal(computeOrderAmountKopeks(4, 1, 0), 0)
  })

  it('formatPagesWithCopies shows multiplier when copies > 1', () => {
    assert.equal(formatPagesWithCopies(5, 1), '5')
    assert.equal(formatPagesWithCopies(5, 2), '5 × 2 копии = 10')
    assert.equal(formatPagesWithCopies(1, 3), '1 × 3 копии = 3')
  })
})
