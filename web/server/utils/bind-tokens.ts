import { randomBytes } from 'node:crypto'
import type { BindTokenPurpose, PaymentMethod, Point } from '@prisma/client'
import { pointAgentStatusPayload } from './points'
import { prisma } from './prisma'

const SLUG_PATTERN = /^[a-z0-9_]+$/

export function validatePointSlug(slug: string): string {
  const trimmed = slug.trim().toLowerCase()
  if (!trimmed || !SLUG_PATTERN.test(trimmed)) {
    throw createError({
      statusCode: 400,
      data: {
        error: 'slug must contain only lowercase letters, digits, and underscores',
        code: 'INVALID_SLUG',
      },
    })
  }
  return trimmed
}

function generateTokenString(): string {
  const suffix = randomBytes(6).toString('hex')
  return `bind_${suffix}`
}

export async function generateBindToken(
  pointId: string,
  purpose: BindTokenPurpose,
  ttlHours = 24,
): Promise<{ token: string, expiresAt: Date }> {
  const token = generateTokenString()
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000)

  await prisma.bindToken.create({
    data: {
      token,
      pointId,
      purpose,
      expiresAt,
    },
  })

  return { token, expiresAt }
}

export type ConsumedBindToken = {
  point: Point
  token: string
}

export async function consumeBindToken(
  rawToken: string,
  expectedPurpose: BindTokenPurpose,
): Promise<ConsumedBindToken> {
  const token = rawToken.trim()
  if (!token) {
    throw createError({
      statusCode: 400,
      data: { error: 'Token is required', code: 'TOKEN_REQUIRED' },
    })
  }

  const record = await prisma.bindToken.findUnique({
    where: { token },
    include: { point: true },
  })

  if (!record) {
    throw createError({
      statusCode: 404,
      data: { error: 'Токен не найден', code: 'TOKEN_NOT_FOUND' },
    })
  }

  if (record.purpose !== expectedPurpose) {
    throw createError({
      statusCode: 400,
      data: { error: 'Неверный тип токена', code: 'TOKEN_WRONG_PURPOSE' },
    })
  }

  if (record.usedAt) {
    throw createError({
      statusCode: 400,
      data: { error: 'Токен уже использован', code: 'TOKEN_ALREADY_USED' },
    })
  }

  if (record.expiresAt.getTime() < Date.now()) {
    throw createError({
      statusCode: 400,
      data: { error: 'Срок действия токена истёк', code: 'TOKEN_EXPIRED' },
    })
  }

  if (!record.point.isActive) {
    throw createError({
      statusCode: 400,
      data: { error: 'Точка неактивна', code: 'POINT_INACTIVE' },
    })
  }

  await prisma.bindToken.update({
    where: { token },
    data: { usedAt: new Date() },
  })

  return { point: record.point, token }
}

export function getTelegramBindDeepLink(token: string): string | null {
  const config = useRuntimeConfig()
  const botUsername = String(process.env.TELEGRAM_BOT_USERNAME ?? '').trim()
  if (!botUsername || !config.telegramBotToken) {
    return null
  }
  return `https://t.me/${botUsername}?start=${token}`
}

export function serializePointForAdmin(point: {
  id: string
  slug: string
  name: string
  isActive: boolean
  pricePerPageKopeks: number
  paymentMethodsEnabled: PaymentMethod[]
  transferPhone: string | null
  transferBankLabel: string | null
  lastSeenAt: Date | null
  createdAt: Date
}) {
  const status = pointAgentStatusPayload(point)
  return {
    id: point.id,
    slug: point.slug,
    name: point.name,
    isActive: point.isActive,
    pricePerPageKopeks: point.pricePerPageKopeks,
    paymentMethodsEnabled: point.paymentMethodsEnabled,
    transferPhone: point.transferPhone,
    transferBankLabel: point.transferBankLabel,
    createdAt: point.createdAt.toISOString(),
    ...status,
  }
}
