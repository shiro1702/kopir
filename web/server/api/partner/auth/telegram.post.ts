import { prisma } from '../../../utils/prisma'
import {
  clearPartnerSessionCookie,
  setPartnerSessionCookie,
} from '../../../utils/partner-session'
import {
  displayNameFromTelegramLogin,
  parseTelegramUserId,
  verifyTelegramLogin,
  type TelegramLoginPayload,
} from '../../../utils/telegram-login'

type AuthBody = {
  mode?: 'login' | 'register'
  acceptOffer?: boolean
  telegram: TelegramLoginPayload
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const botToken = String(config.telegramBotToken ?? '').trim()
  if (!botToken) {
    throw createError({
      statusCode: 503,
      data: { error: 'Telegram bot is not configured', code: 'TELEGRAM_NOT_CONFIGURED' },
    })
  }

  const body = await readBody<AuthBody>(event)
  const telegram = body?.telegram
  if (!telegram || typeof telegram !== 'object') {
    throw createError({
      statusCode: 400,
      data: { error: 'telegram payload is required', code: 'INVALID_PAYLOAD' },
    })
  }

  if (!verifyTelegramLogin(telegram, botToken)) {
    throw createError({
      statusCode: 401,
      data: { error: 'Неверные данные Telegram Login', code: 'INVALID_TELEGRAM_LOGIN' },
    })
  }

  const telegramId = parseTelegramUserId(telegram.id)
  if (!telegramId) {
    throw createError({
      statusCode: 400,
      data: { error: 'Invalid telegram id', code: 'INVALID_TELEGRAM_ID' },
    })
  }

  const mode = body.mode === 'register' ? 'register' : 'login'
  const displayName = displayNameFromTelegramLogin(telegram)

  let partner = await prisma.partner.findUnique({ where: { telegramId } })

  if (mode === 'register') {
    if (!body.acceptOffer) {
      throw createError({
        statusCode: 400,
        data: {
          error: 'Нужно принять оферту',
          code: 'OFFER_NOT_ACCEPTED',
        },
      })
    }

    if (!partner) {
      partner = await prisma.partner.create({
        data: {
          telegramId,
          name: displayName,
          offerAcceptedAt: new Date(),
        },
      })
    } else {
      partner = await prisma.partner.update({
        where: { id: partner.id },
        data: {
          name: partner.name || displayName,
          offerAcceptedAt: partner.offerAcceptedAt ?? new Date(),
        },
      })
    }
  } else {
    if (!partner) {
      throw createError({
        statusCode: 404,
        data: {
          error: 'Партнёр не найден. Зарегистрируйтесь на сайте',
          code: 'PARTNER_NOT_FOUND',
        },
      })
    }
    if (displayName && !partner.name) {
      partner = await prisma.partner.update({
        where: { id: partner.id },
        data: { name: displayName },
      })
    }
  }

  setPartnerSessionCookie(event, partner.id)

  const pointsCount = await prisma.point.count({ where: { partnerId: partner.id } })

  return {
    partner: {
      id: partner.id,
      name: partner.name,
      offerAcceptedAt: partner.offerAcceptedAt?.toISOString() ?? null,
      pointsCount,
    },
  }
})
