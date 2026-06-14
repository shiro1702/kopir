import type { Order, User } from '@prisma/client'
import { OrderStatus } from '@prisma/client'
import { uploadOrderFile } from '../blob'
import { detectDocumentKind, mimeTypeForKind } from '../file-types'
import { prisma } from '../prisma'
import { resolvePointBySlug } from '../points'
import { DEFAULT_POINT_SLUG } from './constants'
import * as messages from './messages'
import { getPointPreference, setPointPreference } from './preferences'
import type {
  BotUser,
  IncomingDocument,
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

async function sendToUser(user: Pick<User, 'telegramId' | 'maxUserId'>, text: string): Promise<void> {
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
    console.error('[bot] notification failed:', errors)
    throw errors[0]
  }
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

export async function handleDocument(
  platform: MessengerPlatform,
  target: MessengerReplyTarget,
  user: BotUser,
  document: IncomingDocument,
  adapter: MessengerAdapter,
): Promise<void> {
  const fileName = document.fileName
  const kind = detectDocumentKind(fileName, document.mimeType)

  if (kind === 'unsupported') {
    await adapter.sendText(target, messages.MSG_UNSUPPORTED_FILE)
    return
  }

  const pointSlug = getPointPreference(platform, target.chatId) ?? DEFAULT_POINT_SLUG
  const point = await resolvePointBySlug(pointSlug)
  const dbUser = await upsertBotUser(platform, user)
  const mimeType = document.mimeType || mimeTypeForKind(kind, fileName)
  const isWord = kind === 'word'

  const order = await prisma.order.create({
    data: {
      status: isWord ? OrderStatus.CALCULATING : OrderStatus.AWAITING_PAYMENT,
      fileName,
      filePath: '',
      mimeType,
      userId: dbUser.id,
      pointId: point.id,
    },
  })

  const buffer = await document.download()
  const blob = await uploadOrderFile(order.id, buffer, {
    fileName,
    mimeType,
    kind,
  })
  await prisma.order.update({
    where: { id: order.id },
    data: { filePath: blob.url },
  })

  const shortId = order.id.slice(-6)
  if (isWord) {
    await adapter.sendText(target, messages.formatCalculating(fileName, shortId))
    return
  }

  await adapter.sendText(target, messages.formatOrderReceived(fileName, shortId))
}

/** @deprecated Use handleDocument */
export const handlePdfDocument = handleDocument

export async function notifyPaymentConfirmed(
  user: Pick<User, 'telegramId' | 'maxUserId'>,
  orderId: string,
): Promise<void> {
  await sendToUser(user, messages.formatPaymentConfirmed(orderId.slice(-6)))
}

export async function notifyQuoteReady(
  user: Pick<User, 'telegramId' | 'maxUserId'>,
  order: Pick<Order, 'id' | 'fileName' | 'pageCount' | 'amountKopeks'>,
): Promise<void> {
  await sendToUser(
    user,
    messages.formatQuote(order.fileName, order.pageCount, order.amountKopeks),
  )
}

export async function notifyCalculationFailed(
  user: Pick<User, 'telegramId' | 'maxUserId'>,
  order: Pick<Order, 'fileName' | 'errorMessage'>,
): Promise<void> {
  await sendToUser(user, messages.formatCalculationFailed(order.fileName, order.errorMessage))
}

export async function notifyPrintComplete(
  user: Pick<User, 'telegramId' | 'maxUserId'>,
  orderId: string,
): Promise<void> {
  await sendToUser(user, messages.formatPrintComplete(orderId.slice(-6)))
}
