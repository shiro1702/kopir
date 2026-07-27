import { prisma } from '../../utils/prisma'
import {
  assertPrintRateLimit,
  setPrintSessionCookie,
} from '../../utils/print-session'
import { parseAndValidateTelegramWebAppInitData } from '../../utils/telegram-webapp-auth'
import { getActiveCollectingBatch } from '../../utils/batch'
import { serializePrintBatch } from '../../utils/print-batch-dto'

interface AuthBody {
  initData?: string
  platform?: 'telegram' | 'max'
}

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  assertPrintRateLimit(`miniapp-auth:${ip}`, 40, 60_000)

  const body = await readBody<AuthBody>(event)
  const initData = body?.initData?.trim()
  if (!initData) {
    throw createError({
      statusCode: 400,
      data: { error: 'initData is required', code: 'MISSING_INIT_DATA' },
    })
  }

  const platform = body.platform === 'max' ? 'max' : 'telegram'
  if (platform === 'max') {
    throw createError({
      statusCode: 501,
      data: {
        error: 'MAX Mini App auth is not available yet',
        code: 'MAX_MINIAPP_NOT_READY',
      },
    })
  }

  const config = useRuntimeConfig(event)
  const botToken = String(config.telegramBotToken ?? '').trim()
  if (!botToken) {
    throw createError({
      statusCode: 503,
      data: { error: 'Telegram bot is not configured', code: 'TELEGRAM_NOT_CONFIGURED' },
    })
  }

  let parsed
  try {
    parsed = parseAndValidateTelegramWebAppInitData(initData, botToken)
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error && 'data' in error) {
      const err = error as { statusCode: number, data: { error: string, code: string } }
      throw createError({
        statusCode: err.statusCode,
        data: err.data,
      })
    }
    throw error
  }
  const telegramId = BigInt(parsed.user.id)

  const user = await prisma.user.upsert({
    where: { telegramId },
    update: {
      username: parsed.user.username ?? null,
      firstName: parsed.user.first_name ?? null,
    },
    create: {
      telegramId,
      username: parsed.user.username ?? null,
      firstName: parsed.user.first_name ?? null,
    },
    select: {
      id: true,
      preferredPointSlug: true,
    },
  })

  setPrintSessionCookie(event, user.id)

  const batch = await getActiveCollectingBatch(user.id)
  const fresh = batch
    ? await prisma.orderBatch.findUnique({
        where: { id: batch.id },
        include: {
          orders: { orderBy: { batchIndex: 'asc' } },
          point: {
            select: {
              id: true,
              slug: true,
              name: true,
              address: true,
              displayCode: true,
              pricePerPageKopeks: true,
              citySlug: true,
            },
          },
        },
      })
    : null

  return {
    userId: user.id,
    preferredPointSlug: user.preferredPointSlug,
    startParam: parsed.startParam,
    batch: fresh ? serializePrintBatch(fresh) : null,
  }
})
