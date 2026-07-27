import { resolveTelegramBotUsernameForAdmin } from '../utils/bind-tokens'

/**
 * Fill public.telegramBotUsername for landing CTAs when only TELEGRAM_BOT_TOKEN is set.
 * Cached inside resolveTelegramBotUsernameForAdmin after the first getMe call.
 */
export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname
  if (path.startsWith('/api/') || path.startsWith('/_nuxt/') || path.startsWith('/_ipx/')) {
    return
  }

  const config = useRuntimeConfig(event)
  const current = String(config.public.telegramBotUsername ?? '').trim()
  if (current) {
    return
  }

  const username = await resolveTelegramBotUsernameForAdmin()
  if (username) {
    config.public.telegramBotUsername = username
  }
})
