import { prisma } from '../prisma'
import type { BatchKeyboardMode, MessengerPlatform } from './types'

const lastBatchKeyboardMode = new Map<string, BatchKeyboardMode>()

export function preferenceKey(platform: MessengerPlatform, chatId: string | number): string {
  return `${platform}:${chatId}`
}

export async function getPointPreference(userId: string): Promise<string | undefined> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferredPointSlug: true },
  })
  return user?.preferredPointSlug ?? undefined
}

export async function setPointPreference(userId: string, slug: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { preferredPointSlug: slug },
  })
}

export async function clearPointPreference(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { preferredPointSlug: null },
  })
}

export function getLastBatchKeyboardMode(
  platform: MessengerPlatform,
  chatId: string | number,
): BatchKeyboardMode | undefined {
  return lastBatchKeyboardMode.get(preferenceKey(platform, chatId))
}

export function setLastBatchKeyboardMode(
  platform: MessengerPlatform,
  chatId: string | number,
  mode: BatchKeyboardMode,
): void {
  lastBatchKeyboardMode.set(preferenceKey(platform, chatId), mode)
}

export function clearLastBatchKeyboardMode(
  platform: MessengerPlatform,
  chatId: string | number,
): void {
  lastBatchKeyboardMode.delete(preferenceKey(platform, chatId))
}

const userGeoCoords = new Map<string, { lat: number, lng: number }>()

export function setUserGeoCoords(
  platform: MessengerPlatform,
  chatId: string | number,
  coords: { lat: number, lng: number },
): void {
  userGeoCoords.set(preferenceKey(platform, chatId), coords)
}

export function getUserGeoCoords(
  platform: MessengerPlatform,
  chatId: string | number,
): { lat: number, lng: number } | undefined {
  return userGeoCoords.get(preferenceKey(platform, chatId))
}

export function clearUserGeoCoords(
  platform: MessengerPlatform,
  chatId: string | number,
): void {
  userGeoCoords.delete(preferenceKey(platform, chatId))
}
