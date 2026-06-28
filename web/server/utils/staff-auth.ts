import type { MessengerPlatform } from '@prisma/client'
import {
  getStaffMaxUserId,
  getStaffTelegramChatId,
} from './payment-mode'
import { prisma } from './prisma'

export async function getStaffChannelsForPoint(pointId: string) {
  return prisma.staffChannel.findMany({
    where: { pointId, isActive: true },
  })
}

export async function hasStaffChannelsForPoint(pointId: string): Promise<boolean> {
  const count = await prisma.staffChannel.count({
    where: { pointId, isActive: true },
  })
  return count > 0
}

export async function getTelegramStaffChatIds(pointId: string): Promise<number[]> {
  const channels = await getStaffChannelsForPoint(pointId)
  const fromDb = channels
    .filter((ch) => ch.platform === 'telegram' && ch.chatId !== null)
    .map((ch) => Number(ch.chatId))

  if (fromDb.length > 0) {
    return fromDb
  }

  const envChatId = getStaffTelegramChatId()
  return envChatId ? [envChatId] : []
}

export async function getMaxStaffUserIds(pointId: string): Promise<number[]> {
  const channels = await getStaffChannelsForPoint(pointId)
  const fromDb = channels
    .filter((ch) => ch.platform === 'max' && ch.userId !== null)
    .map((ch) => Number(ch.userId))

  if (fromDb.length > 0) {
    return fromDb
  }

  const envUserId = getStaffMaxUserId()
  return envUserId ? [envUserId] : []
}

export async function hasStaffNotifyTargets(pointId: string): Promise<boolean> {
  const tg = await getTelegramStaffChatIds(pointId)
  const max = await getMaxStaffUserIds(pointId)
  return tg.length > 0 || max.length > 0
}

export async function isStaffForPointTelegram(
  chatId: number,
  pointId: string,
): Promise<boolean> {
  const channels = await getStaffChannelsForPoint(pointId)
  const tgChannels = channels.filter((ch) => ch.platform === 'telegram')

  if (tgChannels.length > 0) {
    return tgChannels.some((ch) => ch.chatId !== null && Number(ch.chatId) === chatId)
  }

  const envChatId = getStaffTelegramChatId()
  return envChatId !== null && envChatId === chatId
}

export async function isStaffForPointMax(
  userId: number,
  pointId: string,
): Promise<boolean> {
  const channels = await getStaffChannelsForPoint(pointId)
  const maxChannels = channels.filter((ch) => ch.platform === 'max')

  if (maxChannels.length > 0) {
    return maxChannels.some((ch) => ch.userId !== null && Number(ch.userId) === userId)
  }

  const envUserId = getStaffMaxUserId()
  return envUserId !== null && envUserId === userId
}

export async function resolvePointIdFromStaffPayload(data: string): Promise<string | null> {
  const { prisma: db } = await import('./prisma')

  if (data.startsWith('staff_batch_confirm:')) {
    const batchId = data.slice('staff_batch_confirm:'.length)
    const batch = await db.orderBatch.findUnique({
      where: { id: batchId },
      select: { pointId: true },
    })
    return batch?.pointId ?? null
  }

  const orderPrefixes = ['staff_pay:', 'staff_print:', 'staff_manual_print:']
  for (const prefix of orderPrefixes) {
    if (data.startsWith(prefix)) {
      const orderId = data.slice(prefix.length)
      const order = await db.order.findUnique({
        where: { id: orderId },
        select: { pointId: true },
      })
      return order?.pointId ?? null
    }
  }

  return null
}

export async function assertStaffForPayload(
  platform: MessengerPlatform,
  identifier: number,
  payload: string,
): Promise<void> {
  const pointId = await resolvePointIdFromStaffPayload(payload)
  if (!pointId) {
    throw new Error('Заказ не найден')
  }

  const allowed = platform === 'telegram'
    ? await isStaffForPointTelegram(identifier, pointId)
    : await isStaffForPointMax(identifier, pointId)

  if (!allowed) {
    throw new Error('Нет доступа')
  }
}
