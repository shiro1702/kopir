import {
  buildMaxBotUrl,
  buildTelegramBotUrl,
  PARTNER_START_PAYLOAD,
} from '~/utils/marketing/bot-links'

export function usePartnerBotLinks() {
  const config = useRuntimeConfig()

  const username = computed(() =>
    String(config.public.telegramBotUsername ?? '').replace(/^@/, '').trim(),
  )
  const maxBotLink = computed(() => String(config.public.maxBotLink ?? '').trim())

  const hasTelegram = computed(() => Boolean(username.value))

  const telegramPartnerUrl = computed(() =>
    buildTelegramBotUrl(username.value, PARTNER_START_PAYLOAD),
  )

  const maxPartnerUrl = computed(() =>
    buildMaxBotUrl(maxBotLink.value, PARTNER_START_PAYLOAD),
  )

  // reactive(): nested computeds unwrap in templates (plain object leaves Ref → href "[object Object]")
  return reactive({
    hasTelegram,
    telegramPartnerUrl,
    maxPartnerUrl,
  })
}
