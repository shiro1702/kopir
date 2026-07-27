import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'
import type { User } from '@prisma/client'
import { prisma } from './prisma'

export const PRINT_SESSION_COOKIE = 'kopir_guest'
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

export type PrintSessionUser = Pick<
  User,
  'id' | 'telegramId' | 'maxUserId' | 'guestToken' | 'preferredPointSlug' | 'lastPointId' | 'firstName' | 'username'
>

function getSessionSecret(event: H3Event): string {
  const config = useRuntimeConfig(event)
  const secret = String(
    config.partnerSessionSecret || config.adminSecret || '',
  ).trim()
  if (!secret) {
    throw createError({
      statusCode: 500,
      data: { error: 'Print session secret is not configured', code: 'CONFIG' },
    })
  }
  return secret
}

function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

export function createPrintSessionToken(userId: string, secret: string, now = Date.now()): string {
  const expiresAt = now + SESSION_TTL_MS
  const payload = `${userId}.${expiresAt}`
  return `${payload}.${signPayload(payload, secret)}`
}

export function parsePrintSessionToken(
  token: string,
  secret: string,
  now = Date.now(),
): string | null {
  const parts = token.split('.')
  if (parts.length !== 3) {
    return null
  }
  const [userId, expiresRaw, signature] = parts
  if (!userId || !expiresRaw || !signature) {
    return null
  }
  const expiresAt = Number(expiresRaw)
  if (!Number.isFinite(expiresAt) || expiresAt < now) {
    return null
  }

  const payload = `${userId}.${expiresRaw}`
  const expected = signPayload(payload, secret)
  try {
    const a = Buffer.from(expected, 'utf8')
    const b = Buffer.from(signature, 'utf8')
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return null
    }
  } catch {
    return null
  }

  return userId
}

export function setPrintSessionCookie(event: H3Event, userId: string): void {
  const secret = getSessionSecret(event)
  const token = createPrintSessionToken(userId, secret)
  setCookie(event, PRINT_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  })
}

export function clearPrintSessionCookie(event: H3Event): void {
  deleteCookie(event, PRINT_SESSION_COOKIE, { path: '/' })
}

const userSelect = {
  id: true,
  telegramId: true,
  maxUserId: true,
  guestToken: true,
  preferredPointSlug: true,
  lastPointId: true,
  firstName: true,
  username: true,
} as const

export async function resolvePrintSessionUser(event: H3Event): Promise<PrintSessionUser | null> {
  const secret = getSessionSecret(event)
  const token = getCookie(event, PRINT_SESSION_COOKIE)
  if (!token) {
    return null
  }

  const userId = parsePrintSessionToken(token, secret)
  if (!userId) {
    clearPrintSessionCookie(event)
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelect,
  })
  if (!user) {
    clearPrintSessionCookie(event)
    return null
  }

  return user
}

export async function requirePrintSessionUser(event: H3Event): Promise<PrintSessionUser> {
  const user = await resolvePrintSessionUser(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      data: { error: 'Требуется сессия печати', code: 'UNAUTHORIZED' },
    })
  }
  return user
}

export async function ensureGuestPrintSession(event: H3Event): Promise<PrintSessionUser> {
  const existing = await resolvePrintSessionUser(event)
  if (existing) {
    setPrintSessionCookie(event, existing.id)
    return existing
  }

  const guestToken = randomBytes(24).toString('base64url')
  const user = await prisma.user.create({
    data: { guestToken },
    select: userSelect,
  })
  setPrintSessionCookie(event, user.id)
  return user
}

/** Simple in-memory rate limit (per process). Good enough for MVP on serverless with short bursts. */
const rateBuckets = new Map<string, { count: number, resetAt: number }>()

export function assertPrintRateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now()
  const bucket = rateBuckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs })
    return
  }
  if (bucket.count >= limit) {
    throw createError({
      statusCode: 429,
      data: { error: 'Слишком много запросов, попробуйте позже', code: 'RATE_LIMIT' },
    })
  }
  bucket.count += 1
}
