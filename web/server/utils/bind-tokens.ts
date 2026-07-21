import { randomBytes } from 'node:crypto'
import type { BindTokenPurpose, MessengerPlatform, PaymentMethod, Point, StaffChannel } from '@prisma/client'
import { isRequisitesComplete, parsePartnerRequisites } from './partner-requisites'
import { pointAgentStatusPayload } from './points'
import { serializePointContentForAdmin } from './point-admin-fields'
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

export async function lookupBindTokenPurpose(rawToken: string): Promise<BindTokenPurpose | null> {
  const token = rawToken.trim()
  if (!token) {
    return null
  }
  const record = await prisma.bindToken.findUnique({
    where: { token },
    select: { purpose: true },
  })
  return record?.purpose ?? null
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

let cachedTelegramBotUsername: string | null | undefined

async function resolveTelegramBotUsername(): Promise<string | null> {
  const config = useRuntimeConfig()
  const fromEnv = String(process.env.TELEGRAM_BOT_USERNAME ?? config.telegramBotUsername ?? '').trim()
  if (fromEnv) {
    return fromEnv
  }

  if (cachedTelegramBotUsername !== undefined) {
    return cachedTelegramBotUsername
  }

  if (!config.telegramBotToken) {
    cachedTelegramBotUsername = null
    return null
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/getMe`)
    const payload = await response.json() as { ok?: boolean, result?: { username?: string } }
    cachedTelegramBotUsername = payload.ok && payload.result?.username
      ? payload.result.username
      : null
  } catch {
    cachedTelegramBotUsername = null
  }

  return cachedTelegramBotUsername
}

export async function resolveTelegramBotUsernameForAdmin(): Promise<string | null> {
  return resolveTelegramBotUsername()
}

export function getTelegramBindDeepLink(token: string): string | null {
  const config = useRuntimeConfig()
  const botUsername = String(process.env.TELEGRAM_BOT_USERNAME ?? config.telegramBotUsername ?? '').trim()
  if (!botUsername || !config.telegramBotToken) {
    return null
  }
  return `https://t.me/${botUsername}?start=${token}`
}

export async function getTelegramBindDeepLinkAsync(token: string): Promise<string | null> {
  const config = useRuntimeConfig()
  const botUsername = await resolveTelegramBotUsername()
  if (!botUsername || !config.telegramBotToken) {
    return null
  }
  return `https://t.me/${botUsername}?start=${token}`
}

export function formatStaffChannelLabel(channel: Pick<StaffChannel, 'platform' | 'chatId' | 'userId'>): string {
  if (channel.platform === 'telegram') {
    if (channel.chatId !== null && channel.chatId < BigInt(0)) {
      return 'Telegram (группа)'
    }
    return 'Telegram (личный чат)'
  }
  return 'MAX'
}

export function serializeStaffChannelForAdmin(channel: StaffChannel) {
  const chatId = channel.chatId?.toString() ?? null
  const userId = channel.userId?.toString() ?? null
  return {
    id: channel.id,
    platform: channel.platform,
    chatId,
    userId,
    label: formatStaffChannelLabel(channel),
    identifier: channel.platform === 'telegram' ? chatId : userId,
    isGroup: channel.platform === 'telegram' && channel.chatId !== null && channel.chatId < BigInt(0),
    boundAt: channel.boundAt.toISOString(),
  }
}

export function serializePartnerBindingForAdmin(partner: {
  id: string
  name: string | null
  telegramId: bigint | null
  maxUserId: bigint | null
  requisites?: unknown
} | null) {
  if (!partner) {
    return null
  }
  const platform: MessengerPlatform | null = partner.telegramId
    ? 'telegram'
    : partner.maxUserId
      ? 'max'
      : null
  const requisites = parsePartnerRequisites(partner.requisites as never)
  return {
    id: partner.id,
    name: partner.name,
    platform,
    telegramId: partner.telegramId?.toString() ?? null,
    maxUserId: partner.maxUserId?.toString() ?? null,
    requisites,
    requisitesComplete: isRequisitesComplete(requisites),
    displayName: partner.name
      ?? (partner.telegramId ? `Telegram ${partner.telegramId}` : null)
      ?? (partner.maxUserId ? `MAX ${partner.maxUserId}` : null)
      ?? `Партнёр ${partner.id.slice(-6)}`,
  }
}

export function serializePointForAdmin(point: {
  id: string
  slug: string
  name: string
  displayCode?: string | null
  citySlug: string
  address?: string | null
  lat?: number | null
  lng?: number | null
  timezone: string
  openingHours?: unknown
  acceptsOnlineOrders: boolean
  pickupInstructions?: string | null
  estimatedReadyMinutes?: string | null
  entryPhotoUrl?: string | null
  isActive: boolean
  visibleInList: boolean
  pricePerPageKopeks: number
  commissionPercent: number
  paymentMethodsEnabled: PaymentMethod[]
  transferPhone: string | null
  transferBankLabel: string | null
  lastSeenAt: Date | null
  createdAt: Date
  staffChannels?: StaffChannel[]
  partner?: {
    id: string
    name: string | null
    telegramId: bigint | null
    maxUserId: bigint | null
  } | null
}) {
  const status = pointAgentStatusPayload(point)
  return {
    id: point.id,
    slug: point.slug,
    name: point.name,
    displayCode: point.displayCode ?? null,
    isActive: point.isActive,
    visibleInList: point.visibleInList,
    pricePerPageKopeks: point.pricePerPageKopeks,
    commissionPercent: point.commissionPercent,
    partnerSharePercent: 100 - point.commissionPercent,
    paymentMethodsEnabled: point.paymentMethodsEnabled,
    transferPhone: point.transferPhone,
    transferBankLabel: point.transferBankLabel,
    createdAt: point.createdAt.toISOString(),
    staffChannels: point.staffChannels?.map(serializeStaffChannelForAdmin) ?? [],
    partner: serializePartnerBindingForAdmin(point.partner ?? null),
    ...serializePointContentForAdmin({
      citySlug: point.citySlug,
      address: point.address ?? null,
      lat: point.lat ?? null,
      lng: point.lng ?? null,
      timezone: point.timezone,
      openingHours: point.openingHours,
      acceptsOnlineOrders: point.acceptsOnlineOrders,
      pickupInstructions: point.pickupInstructions ?? null,
      estimatedReadyMinutes: point.estimatedReadyMinutes ?? null,
      entryPhotoUrl: point.entryPhotoUrl ?? null,
    }),
    ...status,
  }
}
