import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { extractReceiptUrl } from './tbank-receipt-link.ts'

describe('tbank-receipt-link', () => {
  it('extractReceiptUrl reads top-level Url', () => {
    assert.equal(
      extractReceiptUrl({ Url: 'https://ofd.example/receipt/1' }),
      'https://ofd.example/receipt/1',
    )
  })

  it('extractReceiptUrl reads nested ReceiptUrl', () => {
    assert.equal(
      extractReceiptUrl({
        Receipt: { ReceiptUrl: 'https://ofd.example/receipt/2' },
      }),
      'https://ofd.example/receipt/2',
    )
  })

  it('extractReceiptUrl returns null when missing', () => {
    assert.equal(extractReceiptUrl({ Status: 'DONE' }), null)
  })
})
