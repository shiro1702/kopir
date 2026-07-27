import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { describe, it } from 'node:test'
import { parseAndValidateTelegramWebAppInitData } from './telegram-webapp-auth.ts'

function buildInitData(botToken: string, user: object, authDate: number, startParam?: string): string {
  const params = new URLSearchParams()
  params.set('user', JSON.stringify(user))
  params.set('auth_date', String(authDate))
  if (startParam) {
    params.set('start_param', startParam)
  }

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')

  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest()
  const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex')
  params.set('hash', hash)
  return params.toString()
}

describe('parseAndValidateTelegramWebAppInitData', () => {
  const botToken = '123456:ABC-DEF'
  const now = 1_700_000_000

  it('accepts valid initData and returns user + start_param', () => {
    const initData = buildInitData(botToken, { id: 42, first_name: 'Ada' }, now, 'point-slug')
    const parsed = parseAndValidateTelegramWebAppInitData(initData, botToken, now)
    assert.equal(parsed.user.id, 42)
    assert.equal(parsed.startParam, 'point-slug')
  })

  it('rejects tampered hash', () => {
    const initData = buildInitData(botToken, { id: 42 }, now) + 'ff'
    assert.throws(
      () => parseAndValidateTelegramWebAppInitData(initData, botToken, now),
      (error: { statusCode?: number }) => error?.statusCode === 401,
    )
  })
})
