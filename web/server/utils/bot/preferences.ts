import type { BatchKeyboardMode, MessengerPlatform } from './types'

const userPointPreference = new Map<string, string>()
const lastBatchKeyboardMode = new Map<string, BatchKeyboardMode>()

export function preferenceKey(platform: MessengerPlatform, chatId: string | number): string {
  return `${platform}:${chatId}`
}

export function setPointPreference(
  platform: MessengerPlatform,
  chatId: string | number,
  slug: string,
): void {
  userPointPreference.set(preferenceKey(platform, chatId), slug)
}

export function getPointPreference(
  platform: MessengerPlatform,
  chatId: string | number,
): string | undefined {
  return userPointPreference.get(preferenceKey(platform, chatId))
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
