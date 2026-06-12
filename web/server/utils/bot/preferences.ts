import type { MessengerPlatform } from './types'

const userPointPreference = new Map<string, string>()

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
