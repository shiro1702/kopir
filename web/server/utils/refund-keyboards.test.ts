import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  batchRefundRequestPayload,
  orderRefundRequestPayload,
  parseBatchRefundRequestPayload,
  parseOrderRefundRequestPayload,
  partnerManualPrintPayload,
  partnerPrintFailedKeyboard,
  partnerRetryPrintPayload,
  printFailureClientKeyboard,
} from './bot/keyboards.ts'

describe('partnerPrintFailedKeyboard', () => {
  it('includes retry and manual print actions', () => {
    const keyboard = partnerPrintFailedKeyboard('order-1')
    assert.equal(keyboard.length, 2)
    assert.equal(keyboard[0]![0]!.callbackData, partnerRetryPrintPayload('order-1'))
    assert.equal(keyboard[1]![0]!.callbackData, partnerManualPrintPayload('order-1'))
  })

  it('adds refund button when online refund is available', () => {
    const keyboard = partnerPrintFailedKeyboard('order-1', { showRefund: true })
    assert.equal(keyboard.length, 3)
    assert.match(keyboard[2]![0]!.callbackData, /partner_refund:order-1/)
  })
})

describe('printFailureClientKeyboard', () => {
  it('adds refund request for single failed order', () => {
    const keyboard = printFailureClientKeyboard([{ id: 'order-1', fileName: 'doc.pdf' }])
    assert.equal(keyboard.length, 2)
    assert.match(keyboard[1]![0]!.callbackData, /order_refund_request:order-1/)
  })

  it('adds batch refund request for failed batch files', () => {
    const keyboard = printFailureClientKeyboard(
      [
        { id: 'order-1', fileName: 'a.pdf' },
        { id: 'order-2', fileName: 'b.pdf' },
      ],
      'batch-1',
    )
    assert.equal(keyboard.length, 3)
    assert.equal(keyboard[2]![0]!.callbackData, batchRefundRequestPayload('batch-1'))
  })
})

describe('refund request payloads', () => {
  it('round-trips order and batch payloads', () => {
    assert.equal(parseOrderRefundRequestPayload(orderRefundRequestPayload('abc')), 'abc')
    assert.equal(parseBatchRefundRequestPayload(batchRefundRequestPayload('xyz')), 'xyz')
  })
})
