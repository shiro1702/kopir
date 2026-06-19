import type { Order, User } from '@prisma/client'
import { OrderBatchStatus, OrderStatus } from '@prisma/client'
import {
  cancelBatch,
  expireStaleCollectingBatches,
  finalizeBatch,
  getBatchMaxFiles,
  getNextBatchIndex,
  getOrCreateCollectingBatch,
  recalculateBatchTotals,
} from '../batch'
import { uploadOrderFile } from '../blob'
import { getPricePerPageKopeks } from '../calculation'
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
  await expireStaleCollectingBatches()

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
  const maxFiles = getBatchMaxFiles()

  const batch = await getOrCreateCollectingBatch(dbUser.id, point.id)
  if (batch.orders.length >= maxFiles) {
    await adapter.sendText(target, messages.MSG_BATCH_LIMIT, { showBatchActions: true })
    return
  }

  const batchIndex = await getNextBatchIndex(batch.id)
  const pricePerPage = getPricePerPageKopeks()
  const pageCount = 1
  const amountKopeks = isWord ? 0 : pageCount * pricePerPage

  const order = await prisma.order.create({
    data: {
      status: isWord ? OrderStatus.CALCULATING : OrderStatus.AWAITING_PAYMENT,
      fileName,
      filePath: '',
      mimeType,
      pageCount,
      amountKopeks,
      userId: dbUser.id,
      pointId: point.id,
      batchId: batch.id,
      batchIndex,
    },
  })

  try {
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

    await prisma.orderBatch.update({
      where: { id: batch.id },
      data: { updatedAt: new Date() },
    })
    await recalculateBatchTotals(batch.id)

    await adapter.sendText(
      target,
      messages.formatBatchFileAdded(fileName, batchIndex, maxFiles, isWord),
      { showBatchActions: true },
    )
  } catch (error) {
    console.error('[bot] document upload failed:', order.id, error)
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : 'upload failed',
      },
    })
    await adapter.sendText(target, messages.MSG_UPLOAD_FAILED, { showBatchActions: true })
  }
}

export async function handleBatchAction(
  platform: MessengerPlatform,
  target: MessengerReplyTarget,
  user: BotUser,
  action: 'finalize' | 'cancel',
  adapter: MessengerAdapter,
): Promise<void> {
  await expireStaleCollectingBatches()

  const pointSlug = getPointPreference(platform, target.chatId) ?? DEFAULT_POINT_SLUG
  const point = await resolvePointBySlug(pointSlug)
  const dbUser = await upsertBotUser(platform, user)

  const batch = await prisma.orderBatch.findFirst({
    where: {
      userId: dbUser.id,
      pointId: point.id,
      status: OrderBatchStatus.COLLECTING,
    },
    include: { orders: { orderBy: { batchIndex: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  })

  if (!batch) {
    await adapter.sendText(target, 'Нет активной пачки. Отправьте файл для начала.')
    return
  }

  if (action === 'cancel') {
    await cancelBatch(batch.id)
    await adapter.sendText(target, messages.MSG_BATCH_CANCELLED)
    return
  }

  try {
    const { batch: finalized } = await finalizeBatch(batch.id)
    await adapter.sendText(
      target,
      messages.formatBatchSummary(
        finalized.orders.map((o) => o.fileName),
        finalized.totalPages,
        finalized.totalAmountKopeks,
      ),
    )
    await notifyStaffAfterBatchReady(finalized.id)
  } catch (error) {
    let text = 'Не удалось завершить пачку.'
    if (error && typeof error === 'object' && 'data' in error) {
      const data = (error as { data?: { error?: string } }).data
      if (data?.error) {
        text = data.error
      }
    } else if (error instanceof Error) {
      text = error.message
    }
    await adapter.sendText(target, text, { showBatchActions: true })
  }
}

/** @deprecated Use handleDocument */
export const handlePdfDocument = handleDocument

export async function notifyStaffAfterOrderReady(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, point: true },
    })
    if (!order?.batchId && order?.status === OrderStatus.AWAITING_PAYMENT) {
      const { notifyStaffOrderAwaitingPayment } = await import('../staff-notify')
      await notifyStaffOrderAwaitingPayment(order)
    }
  } catch (error) {
    console.error('[staff] order notify failed:', orderId, error)
  }
}

export async function notifyStaffAfterBatchReady(batchId: string): Promise<void> {
  try {
    const batch = await prisma.orderBatch.findUnique({
      where: { id: batchId },
      include: {
        orders: { orderBy: { batchIndex: 'asc' } },
        user: true,
        point: true,
      },
    })
    if (batch?.status === OrderBatchStatus.AWAITING_PAYMENT) {
      const { notifyStaffBatchAwaitingPayment } = await import('../staff-notify')
      await notifyStaffBatchAwaitingPayment(batch)
    }
  } catch (error) {
    console.error('[staff] batch notify failed:', batchId, error)
  }
}

export async function notifyBatchCancelled(
  user: Pick<User, 'telegramId' | 'maxUserId'>,
  reason: string,
): Promise<void> {
  await sendToUser(user, `${messages.MSG_BATCH_CANCELLED}\n\n${reason}`)
}

export async function notifyBatchPaymentConfirmed(
  user: Pick<User, 'telegramId' | 'maxUserId'>,
  batchId: string,
  fileCount: number,
): Promise<void> {
  await sendToUser(
    user,
    messages.formatBatchPaymentConfirmed(batchId.slice(-6), fileCount),
  )
}

export async function notifyBatchPrintStarted(
  user: Pick<User, 'telegramId' | 'maxUserId'>,
  batchId: string,
  current: number,
  total: number,
): Promise<void> {
  await sendToUser(
    user,
    messages.formatBatchPrintStarted(batchId.slice(-6), current, total),
  )
}

export async function notifyBatchPrintComplete(
  user: Pick<User, 'telegramId' | 'maxUserId'>,
  batchId: string,
  fileCount: number,
): Promise<void> {
  await sendToUser(
    user,
    messages.formatBatchPrintComplete(batchId.slice(-6), fileCount),
  )
}

export async function notifyBatchPrintPartialFailure(
  user: Pick<User, 'telegramId' | 'maxUserId'>,
  batchId: string,
  failedFileNames: string[],
  totalFiles: number,
): Promise<void> {
  await sendToUser(
    user,
    messages.formatBatchPrintPartialFailure(batchId.slice(-6), failedFileNames, totalFiles),
  )
}

export async function notifyBatchFileCalculated(
  user: Pick<User, 'telegramId' | 'maxUserId'>,
  fileName: string,
  fileIndex: number,
  maxFiles: number,
): Promise<void> {
  await sendToUser(
    user,
    messages.formatBatchFileAdded(fileName, fileIndex, maxFiles, false),
  )
}

export async function notifyPaymentReceivedByStaff(
  user: Pick<User, 'telegramId' | 'maxUserId'>,
  orderId: string,
): Promise<void> {
  await sendToUser(user, messages.formatPaymentReceivedByStaff(orderId.slice(-6)))
}

export async function notifyPrintStarted(
  user: Pick<User, 'telegramId' | 'maxUserId'>,
  orderId: string,
): Promise<void> {
  await sendToUser(user, messages.formatPrintStarted(orderId.slice(-6)))
}

/** @deprecated Use notifyPrintStarted */
export async function notifyPaymentConfirmed(
  user: Pick<User, 'telegramId' | 'maxUserId'>,
  orderId: string,
): Promise<void> {
  await notifyPrintStarted(user, orderId)
}

export async function notifyQuoteReady(
  user: Pick<User, 'telegramId' | 'maxUserId'>,
  order: Pick<Order, 'id' | 'fileName' | 'pageCount' | 'amountKopeks' | 'batchId' | 'batchIndex'>,
): Promise<void> {
  if (order.batchId) {
    const batch = await prisma.orderBatch.findUnique({
      where: { id: order.batchId },
    })
    if (batch?.status === OrderBatchStatus.COLLECTING) {
      await recalculateBatchTotals(order.batchId)
      await notifyBatchFileCalculated(
        user,
        order.fileName,
        order.batchIndex ?? 1,
        getBatchMaxFiles(),
      )
      return
    }
  }

  await sendToUser(
    user,
    messages.formatQuote(order.fileName, order.pageCount, order.amountKopeks),
  )
  await notifyStaffAfterOrderReady(order.id)
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
