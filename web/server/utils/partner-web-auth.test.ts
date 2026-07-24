import assert from 'node:assert/strict'
import { createHash, createHmac } from 'node:crypto'
import { describe, it } from 'node:test'
import {
  displayNameFromTelegramLogin,
  parseTelegramUserId,
  verifyTelegramLogin,
  type TelegramLoginPayload,
} from './telegram-login.ts'
import {
  createPartnerSessionToken,
  parsePartnerSessionToken,
} from './partner-session.ts'

function signLogin(data: Omit<TelegramLoginPayload, 'hash'>, botToken: string): TelegramLoginPayload {
  const entries = Object.entries(data)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => [k, String(v)] as const)
    .sort(([a], [b]) => a.localeCompare(b))
  const checkString = entries.map(([k, v]) => `${k}=${v}`).join('\n')
  const secretKey = createHash('sha256').update(botToken).digest()
  const hash = createHmac('sha256', secretKey).update(checkString).digest('hex')
  return { ...data, hash }
}

describe('telegram-login', () => {
  const botToken = '123456:ABC-DEF'
  const now = 1_700_000_000

  it('accepts a valid signed payload', () => {
    const payload = signLogin({
      id: 42,
      first_name: 'Ivan',
      auth_date: now,
    }, botToken)
    assert.equal(verifyTelegramLogin(payload, botToken, 86400, now), true)
  })

  it('rejects tampered hash', () => {
    const payload = signLogin({
      id: 42,
      first_name: 'Ivan',
      auth_date: now,
    }, botToken)
    payload.hash = '0'.repeat(64)
    assert.equal(verifyTelegramLogin(payload, botToken, 86400, now), false)
  })

  it('rejects expired auth_date', () => {
    const payload = signLogin({
      id: 42,
      auth_date: now - 100_000,
    }, botToken)
    assert.equal(verifyTelegramLogin(payload, botToken, 86400, now), false)
  })

  it('parseTelegramUserId and displayNameFromTelegramLogin', () => {
    assert.equal(parseTelegramUserId('99'), 99n)
    assert.equal(parseTelegramUserId('x'), null)
    assert.equal(
      displayNameFromTelegramLogin({ id: 1, first_name: 'A', last_name: 'B', auth_date: 1, hash: 'x' }),
      'A B',
    )
  })
})

describe('partner-session token', () => {
  it('round-trips a valid token', () => {
    const secret = 'test-secret'
    const token = createPartnerSessionToken('partner_1', secret, 1_000_000)
    assert.equal(parsePartnerSessionToken(token, secret, 1_000_000), 'partner_1')
  })

  it('rejects expired token', () => {
    const secret = 'test-secret'
    const token = createPartnerSessionToken('partner_1', secret, 1_000_000)
    assert.equal(parsePartnerSessionToken(token, secret, 1_000_000 + 31 * 24 * 60 * 60 * 1000), null)
  })

  it('rejects bad signature', () => {
    const secret = 'test-secret'
    const token = createPartnerSessionToken('partner_1', secret, 1_000_000)
    const bad = `${token.slice(0, -4)}xxxx`
    assert.equal(parsePartnerSessionToken(bad, secret, 1_000_000), null)
  })
})
