import { OrderStatus } from '@prisma/client'
import { uploadOrderPdf } from '../blob'
import { prisma } from '../prisma'
import { resolvePointBySlug } from '../points'
import { DEFAULT_POINT_SLUG } from './constants'
import * as messages from './messages'
import { getPointPreference, setPointPreference } from './preferences'
import type {
  BotUser,
  IncomingPdf,
  MessengerAdapter,
  MessengerPlatform,
  MessengerReplyTarget,
} from './types'

async function upsertBotUser(platform: MessengerPlatform, user: BotUser) {
  const messengerUserId = BigInt(user.externalId)
  const profile = {
    username: user.username ?? null,
    firstName: user.firstName ?? null,
  }

  if (platform === 'telegram') {
    return prisma.user.upsert({
      where: { telegramId: messengerUserId },
      update: profile,
      create: { telegramId: messengerUserId, ...profile },
    })
  }

  return prisma.user.upsert({
    where: { maxUserId: messengerUserId },
    update: profile,
    create: { maxUserId: messengerUserId, ...profile },
  })
}

export async function handleStart(
  platform: MessengerPlatform,
  target: MessengerReplyTarget,
  pointSlug: string | undefined,
  adapter: MessengerAdapter,
): Promise<void> {
  const slug = pointSlug?.trim() || DEFAULT_POINT_SLUG

  try {
    await resolvePointBySlug(slug)
    setPointPreference(platform, target.chatId, slug)
  } catch {
    setPointPreference(platform, target.chatId, DEFAULT_POINT_SLUG)
  }

  await adapter.sendText(target, messages.MSG_START)
}

export async function handlePdfDocument(
  platform: MessengerPlatform,
  target: MessengerReplyTarget,
  user: BotUser,
  pdf: IncomingPdf,
  adapter: MessengerAdapter,
): Promise<void> {
  const fileName = pdf.fileName
  const mimeType = pdf.mimeType ?? ''
  const isPdf =
    mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')

  if (!isPdf) {
    await adapter.sendText(target, messages.MSG_PDF_ONLY)
    return
  }

  const pointSlug = getPointPreference(platform, target.chatId) ?? DEFAULT_POINT_SLUG
  const point = await resolvePointBySlug(pointSlug)
  const dbUser = await upsertBotUser(platform, user)

  const order = await prisma.order.create({
    data: {
      status: OrderStatus.AWAITING_PAYMENT,
      fileName,
      filePath: '',
      userId: dbUser.id,
      pointId: point.id,
    },
  })

  const buffer = await pdf.download()
  const blob = await uploadOrderPdf(order.id, buffer)
  await prisma.order.update({
    where: { id: order.id },
    data: { filePath: blob.url },
  })

  const shortId = order.id.slice(-6)
  await adapter.sendText(target, messages.formatOrderReceived(fileName, shortId))
}

export async function notifyPaymentConfirmed(
  user: { telegramId: bigint | null, maxUserId: bigint | null },
  orderId: string,
): Promise<void> {
  const text = messages.formatPaymentConfirmed(orderId.slice(-6))
  const errors: Error[] = []

  if (user.telegramId) {
    try {
      const { sendTelegramText } = await import('../telegram/client')
      await sendTelegramText(Number(user.telegramId), text)
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)))
    }
  }

  if (user.maxUserId) {
    try {
      const { getMaxClient } = await import('../max/client')
      await getMaxClient().sendMessage({ userId: Number(user.maxUserId) }, text)
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)))
    }
  }

  if (errors.length > 0) {
    console.error('[bot] payment notification failed:', errors)
    throw errors[0]
  }
}
