import type { Order, User } from '@prisma/client'
import { OrderBatchStatus, OrderStatus } from '@prisma/client'
import {
  cancelBatch,
  countActiveBatchOrders,
  expireStaleCollectingBatches,
  finalizeBatch,
  getBatchKeyboardMode,
  getBatchMaxFiles,
  getNextBatchIndex,
  getOrCreateCollectingBatch,
  isActiveBatchOrder,
  recalculateBatchTotals,
  removeOrderFromBatch,
} from '../batch'
import { uploadOrderFile } from '../blob'
import { getPricePerPageKopeks } from '../calculation'
import {
  detectDocumentKind,
  ensureFileExtension,
  mimeTypeForKind,
  sniffDocumentKind,
} from '../file-types'
import { prisma } from '../prisma'
import { resolvePointBySlug } from '../points'
import { DEFAULT_POINT_SLUG } from './constants'
import * as messages from './messages'
import { removeConfirmKeyboard, removeFileKeyboard } from './keyboards'
import {
  editOrderClientMessage,
  editOrderClientMessageViaAdapter,
  saveOrderClientMessage,
  sendOrderClientMessageViaAdapter,
} from './order-client-message'
import type {
  BatchKeyboardMode,
  BotUser,
  CallbackContext,
  IncomingDocument,
  MessengerAdapter,
  MessengerPlatform,
  MessengerReplyTarget,
  SentMessage,
  StatusMessageOptions,
} from './types'
import { getLastBatchKeyboardMode, getPointPreference, setLastBatchKeyboardMode, setPointPreference } from './preferences'

async function syncBatchReplyKeyboard(
  platform: MessengerPlatform,
  target: MessengerReplyTarget,
  adapter: MessengerAdapter,
  keyboardMode: BatchKeyboardMode,
): Promise<void> {
  const previous = getLastBatchKeyboardMode(platform, target.chatId)
  if (previous === keyboardMode) {
    return
  }
  setLastBatchKeyboardMode(platform, target.chatId, keyboardMode)
  await adapter.sendText(target, ' ', { batchKeyboard: keyboardMode })
}

function orderStatusOptions(
  orderId: string,
  withRemoveButton: boolean,
): StatusMessageOptions {
  if (!withRemoveButton) {
    return {}
  }
  return { inlineKeyboard: removeFileKeyboard(orderId) }
}

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

async function sendBatchUiToUser(
  user: Pick<User, 'telegramId' | 'maxUserId'>,
  text: string,
  batchKeyboard: BatchKeyboardMode,
): Promise<void> {
  const errors: Error[] = []

  if (user.telegramId) {
    try {
      const { sendTelegramBatchMessage } = await import('../telegram/client')
      await sendTelegramBatchMessage(Number(user.telegramId), text, batchKeyboard)
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)))
    }
  }

  if (user.maxUserId) {
    try {
      const { sendMaxBatchMessage } = await import('../max/client')
      await sendMaxBatchMessage(Number(user.maxUserId), text, batchKeyboard)
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)))
    }
  }

  if (errors.length > 0) {
    console.error('[bot] batch ui notify failed:', errors)
    throw errors[0]
  }
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

  await adapter.sendTyping?.(target, 'upload_document')

  let fileName = document.fileName
  let buffer: Buffer
  try {
    buffer = await document.download()
  } catch (error) {
    console.error('[bot] document download failed:', error)
    await adapter.sendText(target, messages.MSG_UPLOAD_FAILED)
    return
  }

  let kind = detectDocumentKind(fileName, document.mimeType)
  const sniffed = sniffDocumentKind(buffer)
  if (sniffed !== 'unsupported') {
    kind = sniffed
  }

  if (kind === 'unsupported') {
    await adapter.sendText(target, messages.MSG_UNSUPPORTED_FILE)
    return
  }

  fileName = ensureFileExtension(fileName, kind)

  const pointSlug = getPointPreference(platform, target.chatId) ?? DEFAULT_POINT_SLUG
  const point = await resolvePointBySlug(pointSlug)
  const dbUser = await upsertBotUser(platform, user)
  const mimeType = document.mimeType || mimeTypeForKind(kind, fileName)
  const isWord = kind === 'word'
  const maxFiles = getBatchMaxFiles()

  const batch = await getOrCreateCollectingBatch(dbUser.id, point.id)
  const activeCount = await countActiveBatchOrders(batch.id)
  if (activeCount >= maxFiles) {
    const keyboardMode = await getBatchKeyboardMode(batch.id)
    await adapter.sendText(target, messages.MSG_BATCH_LIMIT, { batchKeyboard: keyboardMode })
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

  const receivingText = messages.formatFileReceiving(fileName)
  const statusMessage = await sendOrderClientMessageViaAdapter(adapter, target, receivingText)
  if (statusMessage) {
    await saveOrderClientMessage(order.id, statusMessage)
  }

  try {
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

    const keyboardMode = await getBatchKeyboardMode(batch.id)
    const freshOrder = await prisma.order.findUnique({ where: { id: order.id } })
    if (!freshOrder) {
      return
    }

    const statusText = isWord
      ? messages.formatFileCalculating(fileName, batchIndex, maxFiles)
      : messages.formatBatchFileReady(
          fileName,
          batchIndex,
          maxFiles,
          pageCount,
          keyboardMode === 'ready',
        )

    const edited = await editOrderClientMessageViaAdapter(
      adapter,
      target,
      freshOrder,
      statusText,
      orderStatusOptions(order.id, !isWord),
    )
    if (!edited) {
      await adapter.sendText(target, statusText, { batchKeyboard: keyboardMode })
    }

    await syncBatchReplyKeyboard(platform, target, adapter, keyboardMode)
  } catch (error) {
    console.error('[bot] document upload failed:', order.id, error)
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : 'upload failed',
      },
    })
    const keyboardMode = await getBatchKeyboardMode(batch.id)
    const freshOrder = await prisma.order.findUnique({ where: { id: order.id } })
    if (freshOrder) {
      const edited = await editOrderClientMessageViaAdapter(
        adapter,
        target,
        freshOrder,
        messages.MSG_UPLOAD_FAILED,
        { removeInlineKeyboard: true },
      )
      if (!edited) {
        await adapter.sendText(target, messages.MSG_UPLOAD_FAILED, { batchKeyboard: keyboardMode })
      }
    } else {
      await adapter.sendText(target, messages.MSG_UPLOAD_FAILED, { batchKeyboard: keyboardMode })
    }
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
    await cancelBatch(batch.id, { notifyUser: false })
    setLastBatchKeyboardMode(platform, target.chatId, 'ready')
    await adapter.sendText(target, messages.MSG_BATCH_CANCELLED)
    return
  }

  await adapter.sendTyping?.(target, 'typing')

  try {
    const { batch: finalized } = await finalizeBatch(batch.id)
    setLastBatchKeyboardMode(platform, target.chatId, 'ready')
    const { sendPaymentMethodChoiceForBatch } = await import('./payment-handlers')
    await sendPaymentMethodChoiceForBatch(target, adapter, finalized)
  } catch (error) {
    let text = 'Не удалось завершить пачку.'
    let keyboardMode: BatchKeyboardMode = 'ready'
    if (error && typeof error === 'object' && 'data' in error) {
      const data = (error as { data?: { error?: string, code?: string } }).data
      if (data?.error) {
        text = data.error
      }
      if (data?.code === 'BATCH_CALCULATING') {
        keyboardMode = 'calculating'
      }
    } else if (error instanceof Error) {
      text = error.message
    }
    await adapter.sendText(target, text, { batchKeyboard: keyboardMode })
  }
}

async function loadOrderForUser(orderId: string, user: BotUser) {
  const dbUser = await prisma.user.findFirst({
    where: {
      OR: [
        { telegramId: BigInt(user.externalId) },
        { maxUserId: BigInt(user.externalId) },
      ],
    },
  })
  if (!dbUser) {
    throw createError({
      statusCode: 403,
      data: { error: 'Forbidden', code: 'FORBIDDEN' },
    })
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { batch: true },
  })
  if (!order || order.userId !== dbUser.id) {
    throw createError({
      statusCode: 404,
      data: { error: 'Order not found', code: 'ORDER_NOT_FOUND' },
    })
  }
  return { order, dbUser }
}

export async function handleBatchRemoveRequest(
  target: MessengerReplyTarget,
  user: BotUser,
  orderId: string,
  adapter: MessengerAdapter,
  _callbackCtx: CallbackContext,
  message?: SentMessage,
): Promise<string> {
  const { order } = await loadOrderForUser(orderId, user)

  if (order.batch?.status === OrderBatchStatus.CANCELLED) {
    return messages.MSG_BATCH_BATCH_CANCELLED_ACTION
  }
  if (order.batch?.status !== OrderBatchStatus.COLLECTING) {
    return 'Пачка уже завершена'
  }
  if (!isActiveBatchOrder(order)) {
    return messages.MSG_BATCH_FILE_ALREADY_REMOVED
  }
  if (order.status === OrderStatus.CALCULATING) {
    return messages.MSG_BATCH_CANNOT_REMOVE_CALCULATING
  }

  const confirmText = messages.formatBatchRemoveConfirm(order.fileName)
  const edited = message
    ? await editOrderClientMessageViaAdapter(
        adapter,
        target,
        { clientMessageId: message.messageId, clientMessageChatId: message.chatId },
        confirmText,
        { inlineKeyboard: removeConfirmKeyboard(orderId) },
      )
    : await editOrderClientMessageViaAdapter(
        adapter,
        target,
        order,
        confirmText,
        { inlineKeyboard: removeConfirmKeyboard(orderId) },
      )

  if (!edited) {
    await adapter.sendText(target, confirmText)
  }

  return 'Подтверждение…'
}

export async function handleBatchRemoveConfirm(
  target: MessengerReplyTarget,
  user: BotUser,
  orderId: string,
  adapter: MessengerAdapter,
  _callbackCtx: CallbackContext,
  message?: SentMessage,
): Promise<string> {
  const { order, dbUser } = await loadOrderForUser(orderId, user)
  const result = await removeOrderFromBatch(orderId, dbUser.id)
  const maxFiles = getBatchMaxFiles()

  const removedText = messages.formatFileRemovedInline(result.removedFileName)
  const msgRef = message ?? {
    messageId: order.clientMessageId ?? '',
    chatId: order.clientMessageChatId ?? target.chatId,
  }

  if (msgRef.messageId) {
    await editOrderClientMessageViaAdapter(
      adapter,
      target,
      { clientMessageId: msgRef.messageId, clientMessageChatId: msgRef.chatId },
      removedText,
      { removeInlineKeyboard: true },
    )
  }

  if (result.batchCancelled) {
    setLastBatchKeyboardMode(target.platform, target.chatId, 'ready')
    await adapter.sendText(target, messages.MSG_BATCH_EMPTY_AFTER_REMOVE)
    return messages.MSG_BATCH_EMPTY_AFTER_REMOVE
  }

  const keyboardMode = await getBatchKeyboardMode(result.batchId)
  await syncBatchReplyKeyboard(target.platform, target, adapter, keyboardMode)

  return messages.formatBatchFileRemovedToast(result.remainingCount, maxFiles)
}

export async function handleBatchRemoveCancel(
  target: MessengerReplyTarget,
  user: BotUser,
  orderId: string,
  adapter: MessengerAdapter,
  _callbackCtx: CallbackContext,
  message?: SentMessage,
): Promise<string> {
  const { order } = await loadOrderForUser(orderId, user)

  if (!isActiveBatchOrder(order) || order.batch?.status !== OrderBatchStatus.COLLECTING) {
    return messages.MSG_BATCH_FILE_ALREADY_REMOVED
  }

  const maxFiles = getBatchMaxFiles()
  const keyboardMode = order.batchId
    ? await getBatchKeyboardMode(order.batchId)
    : 'ready'
  const canFinalize = keyboardMode === 'ready'
  const readyText = messages.formatBatchFileReady(
    order.fileName,
    order.batchIndex ?? 1,
    maxFiles,
    order.pageCount,
    canFinalize,
  )

  const msgRef = message ?? order
  if (msgRef && 'clientMessageId' in msgRef && msgRef.clientMessageId) {
    await editOrderClientMessageViaAdapter(
      adapter,
      target,
      msgRef as Pick<Order, 'clientMessageId' | 'clientMessageChatId'>,
      readyText,
      orderStatusOptions(orderId, order.status !== OrderStatus.CALCULATING),
    )
  }

  return 'Отменено'
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
      const { isActiveBatchOrder } = await import('../batch')
      await notifyStaffBatchAwaitingPayment({
        ...batch,
        orders: batch.orders.filter(isActiveBatchOrder),
      })
    }
  } catch (error) {
    console.error('[staff] batch notify failed:', batchId, error)
  }
}

export async function notifyBatchCancelled(
  user: Pick<User, 'telegramId' | 'maxUserId'>,
  extraMessage?: string,
): Promise<void> {
  const text = extraMessage
    ? `${messages.MSG_BATCH_CANCELLED}\n\n${extraMessage}`
    : messages.MSG_BATCH_CANCELLED
  await sendToUser(user, text)
}

export async function notifyBatchPaymentConfirmed(
  user: Pick<User, 'telegramId' | 'maxUserId'>,
  batchId: string,
  fileCount: number,
  agentOffline = false,
): Promise<void> {
  await sendToUser(
    user,
    messages.formatBatchPaymentConfirmed(batchId.slice(-6), fileCount, agentOffline),
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
  order: Pick<Order, 'id' | 'fileName' | 'pageCount' | 'batchId' | 'batchIndex' | 'clientMessageId' | 'clientMessageChatId'>,
): Promise<void> {
  if (!order.batchId) {
    return
  }
  const keyboardMode = await getBatchKeyboardMode(order.batchId)
  const maxFiles = getBatchMaxFiles()
  const text = messages.formatBatchFileReady(
    order.fileName,
    order.batchIndex ?? 1,
    maxFiles,
    order.pageCount,
    keyboardMode === 'ready',
  )
  const edited = await editOrderClientMessage(user, order, text, orderStatusOptions(order.id, true))
  if (!edited) {
    await sendBatchUiToUser(user, text, keyboardMode)
  }
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
  agentOffline = false,
): Promise<void> {
  await sendToUser(user, messages.formatPrintStarted(orderId.slice(-6), agentOffline))
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
  order: Pick<Order, 'id' | 'fileName' | 'pageCount' | 'amountKopeks' | 'batchId' | 'batchIndex' | 'clientMessageId' | 'clientMessageChatId'>,
): Promise<void> {
  if (order.batchId) {
    const batch = await prisma.orderBatch.findUnique({
      where: { id: order.batchId },
    })
    if (batch?.status === OrderBatchStatus.COLLECTING) {
      await recalculateBatchTotals(order.batchId)
      await notifyBatchFileCalculated(user, order)
      return
    }
  }

  const fullOrder = await prisma.order.findUnique({
    where: { id: order.id },
    include: { point: true },
  })
  if (fullOrder && !fullOrder.batchId) {
    const { sendPaymentMethodChoiceToUser } = await import('./payment-handlers')
    await sendPaymentMethodChoiceToUser(user, fullOrder)
    return
  }
  await sendToUser(
    user,
    messages.formatQuote(order.fileName, order.pageCount, order.amountKopeks),
  )
}

export async function notifyCalculationFailed(
  user: Pick<User, 'telegramId' | 'maxUserId'>,
  order: Pick<Order, 'id' | 'fileName' | 'errorMessage' | 'batchId' | 'batchIndex' | 'clientMessageId' | 'clientMessageChatId' | 'status'>,
): Promise<void> {
  if (order.batchId) {
    const batch = await prisma.orderBatch.findUnique({
      where: { id: order.batchId },
    })
    if (batch?.status === OrderBatchStatus.COLLECTING) {
      const text = messages.formatBatchCalculationFailedForFile(order.fileName, order.errorMessage)
      const edited = await editOrderClientMessage(
        user,
        order,
        text,
        orderStatusOptions(order.id, true),
      )
      if (edited) {
        return
      }
    }
  }

  await sendToUser(user, messages.formatCalculationFailed(order.fileName, order.errorMessage))
}

export async function notifyPrintComplete(
  user: Pick<User, 'telegramId' | 'maxUserId'>,
  orderId: string,
): Promise<void> {
  await sendToUser(user, messages.formatPrintComplete(orderId.slice(-6)))
}

export async function notifyPrintFailed(
  user: Pick<User, 'telegramId' | 'maxUserId'>,
  order: Pick<Order, 'id' | 'fileName'>,
): Promise<void> {
  await sendToUser(user, messages.formatPrintFailed(order.id.slice(-6), order.fileName))
}
