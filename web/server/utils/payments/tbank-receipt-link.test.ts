import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { extractReceiptUrl, resolveTbankReceiptUrl } from './tbank-receipt-link.ts'

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

  it('resolveTbankReceiptUrl returns null when receipts disabled', () => {
    const prev = process.env.TBANK_RECEIPT_ENABLED
    process.env.TBANK_RECEIPT_ENABLED = 'false'
    try {
      assert.equal(
        resolveTbankReceiptUrl({ Url: 'https://ofd.example/receipt/1' }),
        null,
      )
    } finally {
      if (prev === undefined) {
        delete process.env.TBANK_RECEIPT_ENABLED
      } else {
        process.env.TBANK_RECEIPT_ENABLED = prev
      }
    }
  })

  it('resolveTbankReceiptUrl reads url from webhook payload', () => {
    const prev = process.env.TBANK_RECEIPT_ENABLED
    process.env.TBANK_RECEIPT_ENABLED = 'true'
    try {
      assert.equal(
        resolveTbankReceiptUrl({ ReceiptUrl: 'https://ofd.example/receipt/3' }),
        'https://ofd.example/receipt/3',
      )
    } finally {
      if (prev === undefined) {
        delete process.env.TBANK_RECEIPT_ENABLED
      } else {
        process.env.TBANK_RECEIPT_ENABLED = prev
      }
    }
  })
})
