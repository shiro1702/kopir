import {
  buildMaxBotUrl,
  buildTelegramBotUrl,
  CLIENT_START_PAYLOAD,
} from '~/utils/marketing/bot-links'

export function useClientBotLinks() {
  const config = useRuntimeConfig()

  const username = computed(() =>
    String(config.public.telegramBotUsername ?? '').replace(/^@/, '').trim(),
  )
  const maxBotLink = computed(() => String(config.public.maxBotLink ?? '').trim())

  const hasTelegram = computed(() => Boolean(username.value))

  const telegramPrintUrl = computed(() =>
    buildTelegramBotUrl(username.value, CLIENT_START_PAYLOAD),
  )

  const maxPrintUrl = computed(() =>
    buildMaxBotUrl(maxBotLink.value, CLIENT_START_PAYLOAD),
  )

  function telegramPointUrl(slug: string): string | null {
    return buildTelegramBotUrl(username.value, slug)
  }

  function maxPointUrl(slug: string): string | null {
    return buildMaxBotUrl(maxBotLink.value, slug)
  }

  const siteUrl = computed(() => String(config.public.siteUrl ?? '').replace(/\/$/, ''))

  function miniAppPointsUrl(): string | null {
    if (!siteUrl.value) {
      return null
    }
    return `${siteUrl.value}/miniapp/points`
  }

  return {
    hasTelegram,
    telegramPrintUrl,
    maxPrintUrl,
    telegramPointUrl,
    maxPointUrl,
    miniAppPointsUrl,
    siteUrl,
  }
}
