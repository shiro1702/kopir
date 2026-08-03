import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { fileStatusKeyboard } from './keyboards'
import { BTN_CANCEL_BATCH, BTN_FINALIZE_BATCH } from './messages'

describe('fileStatusKeyboard withBatchActions', () => {
  it('adds pay + cancel when ready', () => {
    const rows = fileStatusKeyboard('order-1', {
      withRemove: true,
      keyboardMode: 'ready',
      withBatchActions: true,
    })
    const flat = rows.flat()
    assert.ok(flat.some((b) => b.text === BTN_FINALIZE_BATCH && b.callbackData === 'batch_finalize'))
    assert.ok(flat.some((b) => b.text === BTN_CANCEL_BATCH && b.callbackData === 'batch_cancel'))
  })

  it('adds only cancel when calculating', () => {
    const rows = fileStatusKeyboard('order-1', {
      withRemove: false,
      keyboardMode: 'calculating',
      withBatchActions: true,
    })
    const flat = rows.flat()
    assert.ok(!flat.some((b) => b.callbackData === 'batch_finalize'))
    assert.ok(flat.some((b) => b.callbackData === 'batch_cancel'))
  })

  it('omits batch actions by default (MAX uses batchKeyboard attachment)', () => {
    const rows = fileStatusKeyboard('order-1', {
      withRemove: true,
      keyboardMode: 'ready',
    })
    const flat = rows.flat()
    assert.ok(!flat.some((b) => b.callbackData === 'batch_finalize'))
    assert.ok(!flat.some((b) => b.callbackData === 'batch_cancel'))
  })
})
