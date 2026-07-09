import type { Order, User } from '@prisma/client'
import { OrderBatchStatus, OrderStatus } from '@prisma/client'
import {
  cancelBatch,
  countActiveBatchOrders,
  expireStaleCollectingBatches,
  finalizeBatch,
  getActiveBatchOrders,
  getActiveCollectingBatch,
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
import { resolvePointByDisplayCode, resolvePointBySlug, formatPointLabel, isPointAgentOnline, listActivePoints } from '../points'
import { DEFAULT_POINT_SLUG } from './constants'
import * as messages from './messages'
import { fileStatusKeyboard, pointOfflineStartKeyboard, removeConfirmKeyboard } from './keyboards'
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
import {
  clearLastBatchKeyboardMode,
  getLastBatchKeyboardMode,
  setLastBatchKeyboardMode,
  setPointPreference,
} from './preferences'

async function refreshBatchKeyboardForChat(
  platform: MessengerPlatform,
  chatId: string,
  keyboardMode: BatchKeyboardMode,
  force = false,
): Promise<void> {
  const previous = getLastBatchKeyboardMode(platform, chatId)
  if (!force && previous === keyboardMode) {
    return
  }
  setLastBatchKeyboardMode(platform, chatId, keyboardMode)

  if (platform === 'telegram') {
    const { sendTelegramBatchMessage } = await import('../telegram/client')
    await sendTelegramBatchMessage(Number(chatId), ' ', keyboardMode)
  }
}

function resolveOrderClientPlatform(
  user: Pick<User, 'telegramId' | 'maxUserId'>,
  order: Pick<Order, 'clientMessageChatId'>,
): MessengerPlatform | null {
  if (order.clientMessageChatId && user.telegramId
    && order.clientMessageChatId === String(user.telegramId)) {
    return 'telegram'
  }
  if (order.clientMessageChatId && user.maxUserId
    && order.clientMessageChatId === String(user.maxUserId)) {
    return 'max'
  }
  if (user.telegramId) {
    return 'telegram'
  }
  if (user.maxUserId) {
    return 'max'
  }
  return null
}

function orderMessageText(
  order: Pick<Order, 'fileName' | 'batchIndex' | 'pageCount' | 'status' | 'errorMessage' | 'id'>,
  maxFiles: number,
  keyboardMode: BatchKeyboardMode,
  batchContext?: { pointLabel?: string | null, totalAmountKopeks?: number },
): string {
  if (order.status === OrderStatus.CALCULATION_FAILED) {
    return messages.formatBatchCalculationFailedForFile(order.fileName, order.errorMessage)
  }
  return messages.formatBatchFileReady(
    order.fileName,
    order.batchIndex ?? 1,
    maxFiles,
    order.pageCount,
    keyboardMode === 'ready',
    {
      pointLabel: batchContext?.pointLabel,
      totalAmountKopeks: batchContext?.totalAmountKopeks,
      pointOffline: keyboardMode === 'point_offline',
    },
  )
}

async function refreshMaxBatchFileKeyboards(
  batchId: string,
  keyboardMode: BatchKeyboardMode,
  excludeOrderId?: string,
): Promise<void> {
  const batch = await prisma.orderBatch.findUnique({
    where: { id: batchId },
    include: { point: { select: { name: true, displayCode: true } } },
  })
  const orders = await getActiveBatchOrders(batchId)
  const maxFiles = getBatchMaxFiles()
  const { editMaxStatusMessage } = await import('../max/client')
  const pointLabel = batch?.point ? formatPointLabel(batch.point) : null
  const hasOtherPoints = keyboardMode === 'point_offline'
    ? (await listActivePoints()).length > 1
    : false

  for (const order of orders) {
    if (order.id === excludeOrderId || !order.clientMessageId || !order.clientMessageChatId) {
      continue
    }
    if (order.status === OrderStatus.CALCULATING) {
      continue
    }

    const text = orderMessageText(order, maxFiles, keyboardMode, {
      pointLabel,
      totalAmountKopeks: batch?.totalAmountKopeks,
    })
    await editMaxStatusMessage(
      { messageId: order.clientMessageId, chatId: order.clientMessageChatId },
      text,
      orderStatusOptions(order.id, true, 'max', keyboardMode, hasOtherPoints),
    )
  }
}

export async function syncBatchReplyKeyboard(
  platform: MessengerPlatform,
  target: MessengerReplyTarget,
  _adapter: MessengerAdapter,
  batchId: string,
  keyboardMode: BatchKeyboardMode,
  options?: { force?: boolean, excludeOrderId?: string },
): Promise<void> {
  if (platform === 'max') {
    try {
      await refreshMaxBatchFileKeyboards(batchId, keyboardMode, options?.excludeOrderId)
      setLastBatchKeyboardMode(platform, target.chatId, keyboardMode)
    } catch (error) {
      console.error('[bot] max batch keyboard refresh failed:', error)
    }
    return
  }

  await refreshBatchKeyboardForChat(platform, target.chatId, keyboardMode, options?.force)
}

function orderStatusOptions(
  orderId: string,
  withRemoveButton: boolean,
  platform?: MessengerPlatform,
  keyboardMode?: BatchKeyboardMode,
  hasOtherPoints = false,
): StatusMessageOptions {
  const opts: StatusMessageOptions = {}
  if (keyboardMode) {
    const inline = fileStatusKeyboard(orderId, {
      withRemove: withRemoveButton,
      keyboardMode,
      hasOtherPoints,
    })
    if (inline.length > 0) {
      opts.inlineKeyboard = inline
    }
  } else if (withRemoveButton) {
    opts.inlineKeyboard = fileStatusKeyboard(orderId, {
      withRemove: true,
      keyboardMode: 'ready',
    })
  }
  if (platform === 'max' && keyboardMode) {
    opts.batchKeyboard = keyboardMode
  }
  return opts
}

export async function upsertBotUser(platform: MessengerPlatform, user: BotUser) {
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
      select: {
        id: true,
        telegramId: true,
        maxUserId: true,
        username: true,
        firstName: true,
        preferredPointSlug: true,
        lastPointId: true,
      },
    })
  }

  return prisma.user.upsert({
    where: { maxUserId: messengerUserId },
    update: profile,
    create: { maxUserId: messengerUserId, ...profile },
    select: {
      id: true,
      telegramId: true,
      maxUserId: true,
      username: true,
      firstName: true,
      preferredPointSlug: true,
      lastPointId: true,
    },
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

async function sendToUserWithInlineKeyboard(
  user: Pick<User, 'telegramId' | 'maxUserId'>,
  text: string,
  inlineKeyboard: import('./types').InlineKeyboardButton[][],
): Promise<void> {
  const errors: Error[] = []

  if (user.telegramId) {
    try {
      const { sendTelegramStatusMessage } = await import('../telegram/client')
      await sendTelegramStatusMessage(Number(user.telegramId), text, { inlineKeyboard })
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)))
    }
  }

  if (user.maxUserId) {
    try {
      const { getMaxClient } = await import('../max/client')
      const client = getMaxClient()
      const attachments = [{
        type: 'inline_keyboard' as const,
        payload: {
          buttons: inlineKeyboard.map((row) =>
            row.map((btn) => ({
              type: 'callback' as const,
              text: btn.text,
              payload: btn.callbackData ?? '',
              intent: 'default' as const,
            })),
          ),
        },
      }]
      await client.sendMessage({ userId: Number(user.maxUserId) }, text, attachments)
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)))
    }
  }

  if (errors.length > 0) {
    console.error('[bot] notification with keyboard failed:', errors)
    throw errors[0]
  }
}

export async function handleStart(
  platform: MessengerPlatform,
  target: MessengerReplyTarget,
  payload: string | undefined,
  adapter: MessengerAdapter,
  user?: BotUser,
): Promise<void> {
  const trimmed = payload?.trim()

  if (trimmed?.startsWith('bind_')) {
    const { lookupBindTokenPurpose } = await import('../bind-tokens')
    const purpose = await lookupBindTokenPurpose(trimmed)
    if (purpose === 'partner') {
      await handlePartnerBind(platform, target, trimmed, adapter, user)
    } else {
      await handleBind(platform, target, trimmed, adapter, user)
    }
    return
  }

  if (trimmed === 'partner') {
    await handlePartnerCommand(platform, target, undefined, adapter, user)
    return
  }

  let dbUser = user
    ? await upsertBotUser(platform, user)
    : null

  if (trimmed && /^\d{2,4}$/.test(trimmed)) {
    if (!dbUser && user) {
      dbUser = await upsertBotUser(platform, user)
    }
    if (dbUser && user) {
      const { handleDisplayCodeMessage } = await import('./point-selection')
      const handled = await handleDisplayCodeMessage(target, user, trimmed, adapter)
      if (handled) {
        return
      }
    }
  }

  const slug = trimmed || DEFAULT_POINT_SLUG
  let resolvedPoint: Awaited<ReturnType<typeof resolvePointBySlug>> | null = null

  try {
    const point = await resolvePointBySlug(slug)
    resolvedPoint = point
    if (!dbUser && user) {
      dbUser = await upsertBotUser(platform, user)
    }
    if (dbUser) {
      await setPointPreference(dbUser.id, slug)
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { lastPointId: point.id },
      })
    }
  } catch {
    if (trimmed) {
      try {
        const point = await resolvePointByDisplayCode(trimmed)
        resolvedPoint = point
        if (!dbUser && user) {
          dbUser = await upsertBotUser(platform, user)
        }
        if (dbUser) {
          await setPointPreference(dbUser.id, point.slug)
          await prisma.user.update({
            where: { id: dbUser.id },
            data: { lastPointId: point.id },
          })
        }
      } catch {
        if (dbUser) {
          await setPointPreference(dbUser.id, DEFAULT_POINT_SLUG)
        }
      }
    } else if (dbUser) {
      await setPointPreference(dbUser.id, DEFAULT_POINT_SLUG)
    }
  }

  if (resolvedPoint) {
    const pointLabel = formatPointLabel(resolvedPoint)
    if (!isPointAgentOnline(resolvedPoint)) {
      const hasOtherPoints = (await listActivePoints()).length > 1
      const keyboard = pointOfflineStartKeyboard(hasOtherPoints)
      await adapter.sendText(
        target,
        messages.formatPointOfflineAtStart(pointLabel),
        keyboard.length > 0 ? { inlineKeyboard: keyboard } : undefined,
      )
    } else {
      await adapter.sendText(target, messages.formatStartWithPoint(pointLabel), { clientMenu: true })
    }
    return
  }

  await adapter.sendText(target, messages.MSG_START, { clientMenu: true })
}

export async function handleBind(
  platform: MessengerPlatform,
  target: MessengerReplyTarget,
  rawToken: string,
  adapter: MessengerAdapter,
  user?: BotUser,
): Promise<void> {
  const { consumeBindToken } = await import('../bind-tokens')
  const { point } = await consumeBindToken(rawToken, 'staff')

  if (platform === 'telegram') {
    const chatId = BigInt(target.chatId)
    const existing = await prisma.staffChannel.findFirst({
      where: { pointId: point.id, platform: 'telegram', chatId },
    })
    if (existing) {
      await prisma.staffChannel.update({
        where: { id: existing.id },
        data: { isActive: true, boundAt: new Date() },
      })
    } else {
      await prisma.staffChannel.create({
        data: {
          pointId: point.id,
          platform: 'telegram',
          chatId,
        },
      })
    }
  } else {
    const userId = BigInt(user?.externalId ?? target.chatId)
    const existing = await prisma.staffChannel.findFirst({
      where: { pointId: point.id, platform: 'max', userId },
    })
    if (existing) {
      await prisma.staffChannel.update({
        where: { id: existing.id },
        data: { isActive: true, boundAt: new Date() },
      })
    } else {
      await prisma.staffChannel.create({
        data: {
          pointId: point.id,
          platform: 'max',
          userId,
        },
      })
    }
  }

  const isTelegramGroup = platform === 'telegram' && BigInt(target.chatId) < BigInt(0)
  const message = isTelegramGroup
    ? `✅ Группа привязана к точке «${point.name}».\n\nВсе участники чата будут получать уведомления о заказах и смогут подтверждать оплату.`
    : `✅ Вы привязаны к точке «${point.name}».\n\nБудете получать уведомления о заказах и сможете подтверждать оплату.`

  await adapter.sendText(target, message)
}

export async function handlePartnerBind(
  platform: MessengerPlatform,
  target: MessengerReplyTarget,
  rawToken: string,
  adapter: MessengerAdapter,
  user?: BotUser,
): Promise<void> {
  if (!user) {
    await adapter.sendText(target, 'Не удалось определить пользователя')
    return
  }

  const { consumeBindToken } = await import('../bind-tokens')
  const { upsertPartnerFromMessenger } = await import('../partner-auth')
  const { buildPartnerMenuScreen } = await import('../partner-actions')
  const partnerMessages = await import('./partner-messages')

  const { point } = await consumeBindToken(rawToken, 'partner')
  const userId = BigInt(user.externalId)
  const displayName = user.firstName ?? user.username ?? null

  const partner = await upsertPartnerFromMessenger(platform, userId, displayName)
  await prisma.point.update({
    where: { id: point.id },
    data: { partnerId: partner.id },
  })

  const screen = await buildPartnerMenuScreen(platform, userId)
  const { buildPublicOfferUrl } = await import('../public-offer')
  const config = useRuntimeConfig()
  const offerUrl = buildPublicOfferUrl(String(config.public?.siteUrl ?? ''))
  const text = `${partnerMessages.formatPartnerWelcome(point.name, offerUrl)}\n\n${screen.text}`

  await adapter.sendText(target, text, screen.keyboard.length > 0
    ? { inlineKeyboard: screen.keyboard }
    : undefined)
}

export async function handlePartnerCommand(
  platform: MessengerPlatform,
  target: MessengerReplyTarget,
  arg: string | undefined,
  adapter: MessengerAdapter,
  user?: BotUser,
): Promise<void> {
  if (!user) {
    await adapter.sendText(target, 'Не удалось определить пользователя')
    return
  }

  const trimmed = arg?.trim()

  if (trimmed?.startsWith('bind_')) {
    await handlePartnerBind(platform, target, trimmed, adapter, user)
    return
  }

  if (trimmed?.startsWith('phone ')) {
    const parts = trimmed.slice('phone '.length).trim().split(/\s+/)
    const pointId = parts[0]
    const phone = parts.slice(1).join(' ')
    if (!pointId || !phone) {
      await adapter.sendText(target, 'Использование: /partner phone <id_точки> <номер>')
      return
    }
    try {
      const { handlePartnerPhoneCommand } = await import('../partner-actions')
      const text = await handlePartnerPhoneCommand(platform, BigInt(user.externalId), pointId, phone)
      await adapter.sendText(target, text, { partnerMenu: true })
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Ошибка'
      await adapter.sendText(target, text, { partnerMenu: true })
    }
    return
  }

  if (trimmed?.startsWith('req ')) {
    const raw = trimmed.slice('req '.length).trim()
    try {
      const { handlePartnerRequisitesCommand } = await import('../partner-actions')
      const text = await handlePartnerRequisitesCommand(platform, BigInt(user.externalId), raw)
      await adapter.sendText(target, text, { partnerMenu: true })
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Ошибка'
      await adapter.sendText(target, text, { partnerMenu: true })
    }
    return
  }

  const { buildPartnerMenuScreen } = await import('../partner-actions')
  const screen = await buildPartnerMenuScreen(platform, BigInt(user.externalId))
  await adapter.sendText(target, screen.text, screen.keyboard.length > 0
    ? { inlineKeyboard: screen.keyboard }
    : undefined)
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

  const dbUser = await upsertBotUser(platform, user)
  const { resolveAutoBindPointId } = await import('./point-selection')
  const autoPointId = await resolveAutoBindPointId(
    dbUser.id,
    dbUser.preferredPointSlug,
    dbUser.lastPointId,
  )

  const batch = await getOrCreateCollectingBatch(dbUser.id, autoPointId)
  const boundPoint = batch.pointId
    ? batch.point ?? await prisma.point.findUnique({ where: { id: batch.pointId } })
    : null

  if (boundPoint && !isPointAgentOnline(boundPoint)) {
    const hasOtherPoints = (await listActivePoints()).length > 1
    const keyboard = pointOfflineStartKeyboard(hasOtherPoints)
    await adapter.sendText(
      target,
      messages.MSG_POINT_OFFLINE_NO_FILES,
      keyboard.length > 0 ? { inlineKeyboard: keyboard } : undefined,
    )
    return
  }

  const mimeType = document.mimeType || mimeTypeForKind(kind, fileName)
  const isWord = kind === 'word'
  const maxFiles = getBatchMaxFiles()

  const activeCount = await countActiveBatchOrders(batch.id)
  if (activeCount >= maxFiles) {
    const keyboardMode = await getBatchKeyboardMode(batch.id)
    await adapter.sendText(target, messages.MSG_BATCH_LIMIT, { batchKeyboard: keyboardMode })
    return
  }

  const batchIndex = await getNextBatchIndex(batch.id)
  const pricePerPage = boundPoint ? getPricePerPageKopeks(boundPoint) : 0
  const pageCount = 1
  const amountKopeks = isWord || !boundPoint ? 0 : pageCount * pricePerPage

  const order = await prisma.order.create({
    data: {
      status: isWord ? OrderStatus.CALCULATING : OrderStatus.AWAITING_PAYMENT,
      fileName,
      filePath: '',
      mimeType,
      pageCount,
      amountKopeks,
      userId: dbUser.id,
      pointId: batch.pointId,
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

    const freshBatch = await prisma.orderBatch.findUnique({
      where: { id: batch.id },
      include: { point: { select: { name: true, displayCode: true } } },
    })
    const pointLabel = freshBatch?.point ? formatPointLabel(freshBatch.point) : null
    const hasOtherPoints = keyboardMode === 'point_offline'
      ? (await listActivePoints()).length > 1
      : false

    const statusText = isWord
      ? messages.formatFileCalculating(fileName, batchIndex, maxFiles)
      : messages.formatBatchFileReady(
          fileName,
          batchIndex,
          maxFiles,
          pageCount,
          keyboardMode === 'ready',
          {
            pointLabel,
            totalAmountKopeks: freshBatch?.totalAmountKopeks,
            pointOffline: keyboardMode === 'point_offline',
          },
        )

    const statusOpts = orderStatusOptions(
      order.id,
      !isWord,
      platform,
      keyboardMode,
      hasOtherPoints,
    )
    const edited = await editOrderClientMessageViaAdapter(
      adapter,
      target,
      freshOrder,
      statusText,
      statusOpts,
    )
    if (!edited) {
      await adapter.sendText(target, statusText, { batchKeyboard: keyboardMode })
    }

    await syncBatchReplyKeyboard(platform, target, adapter, batch.id, keyboardMode)
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

  const dbUser = await upsertBotUser(platform, user)

  const batch = await getActiveCollectingBatch(dbUser.id)

  if (!batch) {
    await adapter.sendText(target, 'Нет активных файлов. Отправьте документ для начала.', { clientMenu: true })
    return
  }

  if (action === 'cancel') {
    await cancelBatch(batch.id, { notifyUser: false })
    clearLastBatchKeyboardMode(platform, target.chatId)
    await adapter.sendText(target, messages.MSG_BATCH_CANCELLED, { clientMenu: true })
    return
  }

  await adapter.sendTyping?.(target, 'typing')

  try {
    const { batch: finalized } = await finalizeBatch(batch.id)
    clearLastBatchKeyboardMode(platform, target.chatId)
    const { sendPaymentMethodChoiceForBatch } = await import('./payment-handlers')
    await sendPaymentMethodChoiceForBatch(target, adapter, finalized, user.externalId)
  } catch (error) {
    let text = 'Не удалось подготовить к оплате.'
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
    return 'Уже отправлено на оплату'
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
    clearLastBatchKeyboardMode(target.platform, target.chatId)
    await adapter.sendText(target, messages.MSG_BATCH_EMPTY_AFTER_REMOVE)
    return messages.MSG_BATCH_EMPTY_AFTER_REMOVE
  }

  const keyboardMode = await getBatchKeyboardMode(result.batchId)
  await syncBatchReplyKeyboard(
    target.platform,
    target,
    adapter,
    result.batchId,
    keyboardMode,
    { force: keyboardMode === 'ready', excludeOrderId: orderId },
  )

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
  const batch = order.batchId
    ? await prisma.orderBatch.findUnique({
        where: { id: order.batchId },
        include: { point: { select: { name: true, displayCode: true } } },
      })
    : null
  const readyText = messages.formatBatchFileReady(
    order.fileName,
    order.batchIndex ?? 1,
    maxFiles,
    order.pageCount,
    canFinalize,
    {
      pointLabel: batch?.point ? formatPointLabel(batch.point) : null,
      totalAmountKopeks: batch?.totalAmountKopeks,
    },
  )

  const msgRef = message ?? order
  if (msgRef && 'clientMessageId' in msgRef && msgRef.clientMessageId) {
    await editOrderClientMessageViaAdapter(
      adapter,
      target,
      msgRef as Pick<Order, 'clientMessageId' | 'clientMessageChatId'>,
      readyText,
      orderStatusOptions(
        orderId,
        order.status !== OrderStatus.CALCULATING,
        target.platform,
        keyboardMode,
      ),
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
  onlinePayment = false,
): Promise<void> {
  await sendToUser(
    user,
    messages.formatBatchPaymentConfirmed(batchId.slice(-6), fileCount, agentOffline, onlinePayment),
  )
}

export async function sendTbankReceiptLinkToUser(
  user: Pick<User, 'telegramId' | 'maxUserId'>,
  shortId: string,
  receiptUrl: string,
): Promise<void> {
  await sendToUser(user, messages.formatPaymentReceiptLink(shortId, receiptUrl))
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
  failedOrders: Array<{ id: string, fileName: string }>,
  totalFiles: number,
): Promise<void> {
  const { printRetryKeyboard } = await import('./keyboards')
  await sendToUserWithInlineKeyboard(
    user,
    messages.formatBatchPrintPartialFailure(batchId.slice(-6), failedOrders, totalFiles),
    printRetryKeyboard(failedOrders),
  )
}

export async function notifyBatchFileCalculated(
  user: Pick<User, 'telegramId' | 'maxUserId'>,
  order: Pick<Order, 'id' | 'fileName' | 'pageCount' | 'batchId' | 'batchIndex' | 'clientMessageId' | 'clientMessageChatId'>,
): Promise<void> {
  if (!order.batchId) {
    return
  }
  const batch = await prisma.orderBatch.findUnique({
    where: { id: order.batchId },
    include: { point: { select: { name: true, displayCode: true } } },
  })
  if (batch?.status !== OrderBatchStatus.COLLECTING) {
    return
  }
  const keyboardMode = await getBatchKeyboardMode(order.batchId)
  const maxFiles = getBatchMaxFiles()
  const pointLabel = batch.point ? formatPointLabel(batch.point) : null
  const text = messages.formatBatchFileReady(
    order.fileName,
    order.batchIndex ?? 1,
    maxFiles,
    order.pageCount,
    keyboardMode === 'ready',
    {
      pointLabel,
      totalAmountKopeks: batch.totalAmountKopeks,
    },
  )
  const platform = resolveOrderClientPlatform(user, order)
  const edited = await editOrderClientMessage(
    user,
    order,
    text,
    orderStatusOptions(order.id, true, platform ?? undefined, keyboardMode),
  )
  if (!edited) {
    await sendBatchUiToUser(user, text, keyboardMode)
    return
  }

  if (!order.batchId || !order.clientMessageChatId || !platform) {
    return
  }

  const previous = getLastBatchKeyboardMode(platform, order.clientMessageChatId)
  if (previous === 'calculating' && keyboardMode === 'ready') {
    if (platform === 'max') {
      await refreshMaxBatchFileKeyboards(order.batchId, keyboardMode)
    } else {
      await refreshBatchKeyboardForChat(platform, order.clientMessageChatId, keyboardMode)
    }
    setLastBatchKeyboardMode(platform, order.clientMessageChatId, keyboardMode)
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
      const keyboardMode = await getBatchKeyboardMode(order.batchId)
      const platform = resolveOrderClientPlatform(user, order)
      const text = messages.formatBatchCalculationFailedForFile(order.fileName, order.errorMessage)
      const edited = await editOrderClientMessage(
        user,
        order,
        text,
        orderStatusOptions(order.id, true, platform ?? undefined, keyboardMode),
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
  const { printRetryKeyboard } = await import('./keyboards')
  await sendToUserWithInlineKeyboard(
    user,
    messages.formatPrintFailed(order.id.slice(-6), order.fileName),
    printRetryKeyboard([{ id: order.id, fileName: order.fileName }]),
  )
}

export async function notifyPrintAutoRetry(
  user: Pick<User, 'telegramId' | 'maxUserId'>,
  fileName: string,
  batchId?: string | null,
): Promise<void> {
  const text = batchId
    ? messages.formatBatchPrintAutoRetry(batchId.slice(-6), fileName)
    : messages.formatPrintAutoRetry(fileName)
  await sendToUser(user, text)
}

export async function notifyPrintRetryStarted(
  user: Pick<User, 'telegramId' | 'maxUserId'>,
  fileName: string,
  batchId?: string | null,
): Promise<void> {
  const text = batchId
    ? messages.formatBatchPrintRetryStarted(batchId.slice(-6), fileName)
    : messages.formatPrintRetryStarted(fileName)
  await sendToUser(user, text)
}

export async function handleClientOrderRetry(
  user: BotUser,
  orderId: string,
): Promise<string> {
  const { order } = await loadOrderForUser(orderId, user)

  if (order.status !== OrderStatus.FAILED) {
    if (order.status === OrderStatus.PAID || order.status === OrderStatus.PRINTING) {
      return 'Печать уже в очереди'
    }
    return 'Повтор недоступен для этого заказа'
  }

  const { retryOrderPrint } = await import('../order-staff-actions')
  const result = await retryOrderPrint(orderId)
  if (result.alreadyQueued) {
    return 'Печать уже в очереди'
  }
  return '🔄 Повторная печать запущена'
}
