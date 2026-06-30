import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildTbankToken, verifyTbankNotificationToken } from './tbank-client.ts'

describe('tbank-client token', () => {
  it('buildTbankToken matches documented example shape', () => {
    const token = buildTbankToken(
      {
        TerminalKey: 'MerchantTerminalKey',
        Amount: 19200,
        OrderId: '00000',
        Description: 'Печать #abc123',
      },
      'MerchantPassword',
    )
    assert.equal(typeof token, 'string')
    assert.equal(token.length, 64)
    assert.match(token, /^[a-f0-9]+$/)
  })

  it('buildTbankToken is deterministic for same inputs', () => {
    const params = {
      TerminalKey: '1782810005234DEMO',
      Amount: 1500,
      OrderId: 'kopir_test_01',
      PayType: 'O',
    }
    const a = buildTbankToken(params, 'test_password')
    const b = buildTbankToken(params, 'test_password')
    assert.equal(a, b)
  })

  it('buildTbankToken excludes nested objects and Token field', () => {
    const withNested = buildTbankToken(
      {
        TerminalKey: 'key',
        Amount: 100,
        OrderId: 'o1',
        DATA: { foo: 'bar' },
        Token: 'ignored',
      },
      'pass',
    )
    const withoutNested = buildTbankToken(
      {
        TerminalKey: 'key',
        Amount: 100,
        OrderId: 'o1',
      },
      'pass',
    )
    assert.equal(withNested, withoutNested)
  })

  it('verifyTbankNotificationToken validates webhook payload', () => {
    const password = 'MerchantPassword'
    const payload = {
      TerminalKey: 'MerchantTerminalKey',
      OrderId: 'kopir_abc',
      Success: true,
      Status: 'CONFIRMED',
      PaymentId: 12345,
      Amount: 1500,
    }
    const token = buildTbankToken(payload, password)
    assert.equal(verifyTbankNotificationToken({ ...payload, Token: token }, password), true)
    assert.equal(verifyTbankNotificationToken({ ...payload, Token: 'bad' }, password), false)
  })
})
