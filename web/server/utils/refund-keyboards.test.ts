import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  batchRefundRequestPayload,
  orderRefundRequestPayload,
  parseBatchRefundRequestPayload,
  parseOrderRefundRequestPayload,
  printFailureClientKeyboard,
} from './bot/keyboards.ts'

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
