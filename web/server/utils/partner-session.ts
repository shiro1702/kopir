import { createHmac, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'
import type { Partner } from '@prisma/client'
import { prisma } from './prisma'

export const PARTNER_SESSION_COOKIE = 'kopir_partner_session'
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

function getSessionSecret(event: H3Event): string {
  const config = useRuntimeConfig(event)
  const secret = String(
    config.partnerSessionSecret || config.adminSecret || '',
  ).trim()
  if (!secret) {
    throw createError({
      statusCode: 500,
      data: { error: 'Partner session secret is not configured', code: 'CONFIG' },
    })
  }
  return secret
}

function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

export function createPartnerSessionToken(partnerId: string, secret: string, now = Date.now()): string {
  const expiresAt = now + SESSION_TTL_MS
  const payload = `${partnerId}.${expiresAt}`
  return `${payload}.${signPayload(payload, secret)}`
}

export function parsePartnerSessionToken(
  token: string,
  secret: string,
  now = Date.now(),
): string | null {
  const parts = token.split('.')
  if (parts.length !== 3) {
    return null
  }
  const [partnerId, expiresRaw, signature] = parts
  if (!partnerId || !expiresRaw || !signature) {
    return null
  }
  const expiresAt = Number(expiresRaw)
  if (!Number.isFinite(expiresAt) || expiresAt < now) {
    return null
  }

  const payload = `${partnerId}.${expiresRaw}`
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

  return partnerId
}

export function setPartnerSessionCookie(event: H3Event, partnerId: string): void {
  const secret = getSessionSecret(event)
  const token = createPartnerSessionToken(partnerId, secret)
  setCookie(event, PARTNER_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  })
}

export function clearPartnerSessionCookie(event: H3Event): void {
  deleteCookie(event, PARTNER_SESSION_COOKIE, { path: '/' })
}

export async function requirePartnerSession(event: H3Event): Promise<Partner> {
  const secret = getSessionSecret(event)
  const token = getCookie(event, PARTNER_SESSION_COOKIE)
  if (!token) {
    throw createError({
      statusCode: 401,
      data: { error: 'Требуется вход', code: 'UNAUTHORIZED' },
    })
  }

  const partnerId = parsePartnerSessionToken(token, secret)
  if (!partnerId) {
    clearPartnerSessionCookie(event)
    throw createError({
      statusCode: 401,
      data: { error: 'Сессия истекла', code: 'UNAUTHORIZED' },
    })
  }

  const partner = await prisma.partner.findUnique({ where: { id: partnerId } })
  if (!partner) {
    clearPartnerSessionCookie(event)
    throw createError({
      statusCode: 401,
      data: { error: 'Партнёр не найден', code: 'UNAUTHORIZED' },
    })
  }

  return partner
}

export async function assertPartnerOwnsPointById(
  partnerId: string,
  pointId: string,
) {
  const point = await prisma.point.findFirst({
    where: { id: pointId, partnerId },
  })
  if (!point) {
    throw createError({
      statusCode: 403,
      data: { error: 'Нет доступа', code: 'FORBIDDEN' },
    })
  }
  return point
}
