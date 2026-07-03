import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildTbankReceiptFfd105 } from './tbank-receipt.ts'

describe('tbank-receipt FFD 1.05', () => {
  it('builds receipt with usn_income and service item', () => {
    const receipt = buildTbankReceiptFfd105({
      amountKopeks: 1000,
      itemName: 'Печать, 1 стр.',
      email: 'client@example.com',
    })

    assert.equal(receipt.Taxation, 'usn_income')
    assert.equal(receipt.Email, 'client@example.com')
    assert.equal(receipt.Items.length, 1)
    assert.equal(receipt.Items[0]?.Name, 'Печать, 1 стр.')
    assert.equal(receipt.Items[0]?.Price, 1000)
    assert.equal(receipt.Items[0]?.Amount, 1000)
    assert.equal(receipt.Items[0]?.Quantity, 1)
    assert.equal(receipt.Items[0]?.Tax, 'none')
    assert.equal(receipt.Items[0]?.PaymentObject, 'service')
    assert.equal(receipt.Items[0]?.PaymentMethod, 'full_payment')
  })

  it('truncates item name to 64 characters', () => {
    const receipt = buildTbankReceiptFfd105({
      amountKopeks: 500,
      itemName: 'А'.repeat(80),
      email: 'a@b.c',
    })
    assert.equal(receipt.Items[0]?.Name.length, 64)
  })
})
