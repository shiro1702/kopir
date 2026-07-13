import type { MessengerPlatform, Partner, Point } from '@prisma/client'
import { prisma } from './prisma'

export async function upsertPartnerFromMessenger(
  platform: MessengerPlatform,
  userId: bigint,
  name?: string | null,
): Promise<Partner> {
  const idField = platform === 'telegram' ? 'telegramId' : 'maxUserId'
  const existing = await prisma.partner.findUnique({
    where: { [idField]: userId },
  })

  if (existing) {
    if (name && !existing.name) {
      return prisma.partner.update({
        where: { id: existing.id },
        data: { name },
      })
    }
    return existing
  }

  return prisma.partner.create({
    data: {
      [idField]: userId,
      name: name ?? null,
    },
  })
}

export async function getPartnerByMessenger(
  platform: MessengerPlatform,
  userId: bigint,
): Promise<Partner | null> {
  if (platform === 'telegram') {
    return prisma.partner.findUnique({ where: { telegramId: userId } })
  }
  return prisma.partner.findUnique({ where: { maxUserId: userId } })
}

export async function getPartnerPoints(partnerId: string): Promise<Point[]> {
  return prisma.point.findMany({
    where: { partnerId },
    orderBy: { name: 'asc' },
  })
}

export type PartnerMessengerTargets = {
  telegramUserId: number | null
  maxUserId: number | null
}

export async function getPartnerMessengerTargetsForPoint(
  pointId: string,
): Promise<PartnerMessengerTargets> {
  const point = await prisma.point.findUnique({
    where: { id: pointId },
    select: {
      partner: {
        select: { telegramId: true, maxUserId: true },
      },
    },
  })

  if (!point?.partner) {
    return { telegramUserId: null, maxUserId: null }
  }

  return {
    telegramUserId: point.partner.telegramId !== null
      ? Number(point.partner.telegramId)
      : null,
    maxUserId: point.partner.maxUserId !== null
      ? Number(point.partner.maxUserId)
      : null,
  }
}

export async function hasPartnerNotifyTargets(pointId: string): Promise<boolean> {
  const targets = await getPartnerMessengerTargetsForPoint(pointId)
  return targets.telegramUserId !== null || targets.maxUserId !== null
}

export async function assertPartnerOwnsPoint(
  platform: MessengerPlatform,
  userId: bigint,
  pointId: string,
): Promise<Partner> {
  const partner = await getPartnerByMessenger(platform, userId)
  if (!partner) {
    throw new Error('Нет доступа')
  }

  const point = await prisma.point.findFirst({
    where: { id: pointId, partnerId: partner.id },
  })
  if (!point) {
    throw new Error('Нет доступа')
  }

  return partner
}

export function resolvePointIdFromPartnerPayload(data: string): string | null {
  const prefixes = [
    'partner_status:',
    'partner_orders:',
    'partner_settings:',
    'partner_point:',
    'partner_price:',
    'partner_price_adj:',
    'partner_toggle_pay:',
    'partner_phone_hint:',
    'partner_links:',
  ]

  for (const prefix of prefixes) {
    if (data.startsWith(prefix)) {
      const rest = data.slice(prefix.length)
      const pointId = rest.split(':')[0]
      return pointId || null
    }
  }

  return null
}
