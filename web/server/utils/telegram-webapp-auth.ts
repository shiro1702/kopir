import { createHmac, timingSafeEqual } from 'node:crypto'

const MAX_AUTH_AGE_SEC = 24 * 60 * 60

export type TelegramWebAppUser = {
  id: number
  username?: string
  first_name?: string
  last_name?: string
}

export type ParsedTelegramWebAppData = {
  user: TelegramWebAppUser
  startParam: string | null
  authDate: number
}

class TelegramWebAppAuthError extends Error {
  statusCode: number
  data: { error: string, code: string }

  constructor(message: string, code: string, statusCode = 401) {
    super(message)
    this.name = 'TelegramWebAppAuthError'
    this.statusCode = statusCode
    this.data = { error: message, code }
  }
}

function initDataError(message: string, code: string, statusCode = 401): never {
  throw new TelegramWebAppAuthError(message, code, statusCode)
}

export function parseAndValidateTelegramWebAppInitData(
  initData: string,
  botToken: string,
  nowSec = Math.floor(Date.now() / 1000),
): ParsedTelegramWebAppData {
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) {
    initDataError('Invalid initData', 'INVALID_INIT_DATA')
  }

  params.delete('hash')
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')

  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest()
  const calculated = createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

  try {
    const a = Buffer.from(calculated, 'hex')
    const b = Buffer.from(hash, 'hex')
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      initDataError('Invalid initData signature', 'INVALID_INIT_DATA')
    }
  } catch (error) {
    if (error instanceof TelegramWebAppAuthError) {
      throw error
    }
    initDataError('Invalid initData signature', 'INVALID_INIT_DATA')
  }

  const authDateRaw = params.get('auth_date')
  const authDate = Number(authDateRaw)
  if (!Number.isFinite(authDate) || authDate <= 0) {
    initDataError('Invalid auth_date', 'INVALID_INIT_DATA')
  }
  if (nowSec - authDate > MAX_AUTH_AGE_SEC) {
    initDataError('initData expired', 'INIT_DATA_EXPIRED')
  }

  const userRaw = params.get('user')
  if (!userRaw) {
    initDataError('initData missing user', 'INVALID_INIT_DATA')
  }

  let user: TelegramWebAppUser
  try {
    user = JSON.parse(userRaw) as TelegramWebAppUser
  } catch {
    initDataError('Invalid user in initData', 'INVALID_INIT_DATA')
  }

  if (!user?.id || !Number.isFinite(user.id)) {
    initDataError('Invalid user id in initData', 'INVALID_INIT_DATA')
  }

  return {
    user,
    startParam: params.get('start_param'),
    authDate,
  }
}
