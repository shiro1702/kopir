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

  return {
    hasTelegram,
    telegramPrintUrl,
    maxPrintUrl,
  }
}
