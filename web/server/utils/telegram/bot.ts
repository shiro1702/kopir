import { Bot } from 'grammy'
import { OrderStatus } from '@prisma/client'
import { uploadOrderPdf } from '../blob'
import { prisma } from '../prisma'
import { resolvePointBySlug } from '../points'

const DEFAULT_POINT_SLUG = 'point_dev_1'

const userPointPreference = new Map<number, string>()

function getBotToken(): string {
  const config = useRuntimeConfig()
  const token = config.telegramBotToken
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is not configured')
  }
  return token
}

let botInstance: Bot | null = null

export function getBot(): Bot {
  if (!botInstance) {
    botInstance = createBot()
  }
  return botInstance
}

function createBot(): Bot {
  const bot = new Bot(getBotToken())

  bot.command('start', async (ctx) => {
    const pointSlug = ctx.match?.trim() || DEFAULT_POINT_SLUG
    userPointPreference.set(ctx.from!.id, pointSlug)

    try {
      await resolvePointBySlug(pointSlug)
    } catch {
      userPointPreference.set(ctx.from!.id, DEFAULT_POINT_SLUG)
    }

    await ctx.reply(
      'Привет! Отправь PDF-документ для печати.\n\n'
      + 'После загрузки файла мы сообщим номер заказа и инструкцию по оплате.',
    )
  })

  bot.on('message:document', async (ctx) => {
    const document = ctx.message.document
    const fileName = document.file_name ?? 'document.pdf'
    const mimeType = document.mime_type ?? ''
    const isPdf =
      mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')

    if (!isPdf) {
      await ctx.reply('Пока принимаем только PDF. Отправьте файл с расширением .pdf')
      return
    }

    const telegramUser = ctx.from!
    const pointSlug = userPointPreference.get(telegramUser.id) ?? DEFAULT_POINT_SLUG
    const point = await resolvePointBySlug(pointSlug)

    const user = await prisma.user.upsert({
      where: { telegramId: BigInt(telegramUser.id) },
      update: {
        username: telegramUser.username ?? null,
        firstName: telegramUser.first_name ?? null,
      },
      create: {
        telegramId: BigInt(telegramUser.id),
        username: telegramUser.username ?? null,
        firstName: telegramUser.first_name ?? null,
      },
    })

    const order = await prisma.order.create({
      data: {
        status: OrderStatus.AWAITING_PAYMENT,
        fileName,
        filePath: '',
        userId: user.id,
        pointId: point.id,
      },
    })

    const file = await ctx.getFile()
    const fileUrl = `https://api.telegram.org/file/bot${getBotToken()}/${file.file_path}`
    const response = await fetch(fileUrl)
    if (!response.ok) {
      throw new Error(`Failed to download file from Telegram: ${response.status}`)
    }
    const buffer = Buffer.from(await response.arrayBuffer())

    const blob = await uploadOrderPdf(order.id, buffer)
    await prisma.order.update({
      where: { id: order.id },
      data: { filePath: blob.url },
    })

    const shortId = order.id.slice(-6)
    await ctx.reply(
      `📄 Файл получен: ${fileName}\n`
      + `Заказ #${shortId}\n`
      + `Статус: ожидает оплаты\n\n`
      + 'Переведите сумму на карту и дождитесь подтверждения администратора.\n'
      + 'В тестовом режиме оплата подтверждается вручную.',
    )
  })

  bot.catch((err) => {
    console.error('[telegram] bot error:', err)
  })

  return bot
}

export async function notifyPaymentConfirmed(telegramId: bigint, orderId: string) {
  const bot = getBot()
  const shortId = orderId.slice(-6)
  await bot.api.sendMessage(
    Number(telegramId),
    `✅ Оплата подтверждена!\nЗаказ #${shortId}\nДокумент отправлен на печать.`,
  )
}
