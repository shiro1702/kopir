import { OrderStatus } from '@prisma/client'
import {
  bindBatchToPoint,
  getActiveBatchOrders,
  getActiveCollectingBatch,
  getBatchKeyboardMode,
  getBatchMaxFiles,
} from '../batch'
import { prisma } from '../prisma'
import { formatPointLabel, listActivePoints, resolvePointByDisplayCode, resolvePointBySlug } from '../points'
import {
  fileStatusKeyboard,
  pointChangeMenuKeyboard,
  pointSelectKeyboard,
  POINTS_PER_PAGE,
} from './keyboards'
import * as messages from './messages'
import { editOrderClientMessageViaAdapter } from './order-client-message'
import type {
  BotUser,
  MessengerAdapter,
  MessengerPlatform,
  MessengerReplyTarget,
  SentMessage,
} from './types'

export interface PointSelectOptions {
  /** Message with point list — edit after selection (callback source). */
  callbackMessage?: SentMessage
}

async function loadDbUser(user: BotUser) {
  return prisma.user.findFirst({
    where: {
      OR: [
        { telegramId: BigInt(user.externalId) },
        { maxUserId: BigInt(user.externalId) },
      ],
    },
  })
}

async function refreshBatchFileCards(
  batchId: string,
  adapter: MessengerAdapter,
  target: MessengerReplyTarget,
  platform: MessengerPlatform,
): Promise<void> {
  const batch = await prisma.orderBatch.findUnique({
    where: { id: batchId },
    include: { point: { select: { name: true, displayCode: true } } },
  })
  if (!batch) {
    return
  }

  const keyboardMode = await getBatchKeyboardMode(batchId)
  const maxFiles = getBatchMaxFiles()
  const orders = await getActiveBatchOrders(batchId)
  const pointLabel = batch.point ? formatPointLabel(batch.point) : null
  const canFinalize = keyboardMode === 'ready'

  for (const order of orders) {
    if (order.status === OrderStatus.CALCULATING) {
      continue
    }
    const text = messages.formatBatchFileReady(
      order.fileName,
      order.batchIndex ?? 1,
      maxFiles,
      order.pageCount,
      canFinalize,
      {
        pointLabel,
        totalAmountKopeks: batch.totalAmountKopeks,
        copies: order.copies,
      },
    )
    const copiesOpts = order.status === OrderStatus.AWAITING_PAYMENT
    const inlineKeyboard = fileStatusKeyboard(order.id, {
      withRemove: order.status !== OrderStatus.CALCULATING,
      keyboardMode,
      withCopies: copiesOpts,
      copies: order.copies,
    })
    if (order.clientMessageId && order.clientMessageChatId) {
      try {
        await editOrderClientMessageViaAdapter(
          adapter,
          target,
          order,
          text,
          { inlineKeyboard, batchKeyboard: keyboardMode },
        )
      } catch (error) {
        console.error('[bot] refreshBatchFileCards edit failed:', order.id, error)
      }
    }
  }

  const { syncBatchReplyKeyboard } = await import('./core')
  try {
    await syncBatchReplyKeyboard(platform, target, adapter, batchId, keyboardMode, { force: true })
  } catch (error) {
    console.error('[bot] syncBatchReplyKeyboard after point refresh failed:', error)
  }
}

async function sendMaxBatchPointSelectedConfirmation(
  batchId: string,
  pointLabel: string,
  target: MessengerReplyTarget,
  adapter: MessengerAdapter,
): Promise<void> {
  const keyboardMode = await getBatchKeyboardMode(batchId)
  const orders = await getActiveBatchOrders(batchId)
  const lastOrder = orders[orders.length - 1]
  const toast = messages.MSG_POINT_SELECTED(pointLabel)

  if (!lastOrder) {
    await adapter.sendText(target, toast)
    return
  }

  const batch = await prisma.orderBatch.findUnique({ where: { id: batchId } })
  const maxFiles = getBatchMaxFiles()
  const fileText = messages.formatBatchFileReady(
    lastOrder.fileName,
    lastOrder.batchIndex ?? 1,
    maxFiles,
    lastOrder.pageCount,
    keyboardMode === 'ready',
    {
      pointLabel,
      totalAmountKopeks: batch?.totalAmountKopeks,
      copies: lastOrder.copies,
    },
  )

  await adapter.sendText(target, `${toast}\n\n${fileText}`, {
    inlineKeyboard: fileStatusKeyboard(lastOrder.id, {
      withRemove: lastOrder.status !== OrderStatus.CALCULATING,
      keyboardMode,
      withCopies: lastOrder.status === OrderStatus.AWAITING_PAYMENT,
      copies: lastOrder.copies,
    }),
    batchKeyboard: keyboardMode,
  })
}

export async function handlePointList(
  target: MessengerReplyTarget,
  user: BotUser,
  adapter: MessengerAdapter,
  page = 0,
): Promise<string> {
  const points = await listActivePoints()
  if (points.length === 0) {
    return 'Нет доступных точек печати.'
  }

  const totalPages = Math.max(1, Math.ceil(points.length / POINTS_PER_PAGE))
  const safePage = Math.min(page, totalPages - 1)
  const text = messages.formatPointListHeader(safePage, totalPages)
  const keyboard = pointSelectKeyboard(points, safePage)

  await adapter.sendText(target, text, { inlineKeyboard: keyboard })
  return 'Выберите точку…'
}

export async function handlePointChangeMenu(
  target: MessengerReplyTarget,
  adapter: MessengerAdapter,
): Promise<string> {
  await adapter.sendText(target, messages.formatPointChangeMenu(), {
    inlineKeyboard: pointChangeMenuKeyboard(),
  })
  return 'Выберите способ…'
}

export async function handlePointSelect(
  target: MessengerReplyTarget,
  user: BotUser,
  slug: string,
  adapter: MessengerAdapter,
  options?: PointSelectOptions,
): Promise<string> {
  const dbUser = await loadDbUser(user)
  if (!dbUser) {
    return 'Ошибка пользователя'
  }

  const point = await resolvePointBySlug(slug)
  const batch = await getActiveCollectingBatch(dbUser.id)

  if (batch) {
    await bindBatchToPoint(batch.id, point.id, dbUser.id)
    const pointLabel = formatPointLabel(point)
    const toast = messages.MSG_POINT_SELECTED(pointLabel)

    try {
      await refreshBatchFileCards(batch.id, adapter, target, target.platform)
    } catch (error) {
      console.error('[bot] refreshBatchFileCards after point select failed:', error)
    }

    if (options?.callbackMessage && adapter.editStatus) {
      try {
        await adapter.editStatus(
          target,
          options.callbackMessage,
          toast,
          { removeInlineKeyboard: true },
        )
      } catch (error) {
        console.error('[bot] edit point list message failed:', error)
      }
    }

    if (target.platform === 'max') {
      try {
        await sendMaxBatchPointSelectedConfirmation(batch.id, pointLabel, target, adapter)
      } catch (error) {
        console.error('[bot] MAX point select confirmation failed:', error)
        await adapter.sendText(target, toast)
      }
    }

    return toast
  }

  const { setPointPreference } = await import('./preferences')
  await setPointPreference(dbUser.id, point.slug)
  await prisma.user.update({
    where: { id: dbUser.id },
    data: { lastPointId: point.id },
  })
  await adapter.sendText(target, messages.formatStartWithPoint(formatPointLabel(point)))
  return messages.MSG_POINT_SELECTED(formatPointLabel(point))
}

export async function handlePointBack(
  target: MessengerReplyTarget,
  user: BotUser,
  adapter: MessengerAdapter,
): Promise<string> {
  const dbUser = await loadDbUser(user)
  if (!dbUser) {
    return 'Ошибка'
  }

  const batch = await getActiveCollectingBatch(dbUser.id)
  if (!batch) {
    return 'Нет активных файлов'
  }

  const keyboardMode = await getBatchKeyboardMode(batch.id)
  const orders = await getActiveBatchOrders(batch.id)
  const lastOrder = orders[orders.length - 1]
  if (!lastOrder) {
    return 'Нет файлов'
  }

  const maxFiles = getBatchMaxFiles()
  const pointLabel = batch.point ? formatPointLabel(batch.point) : null
  const text = messages.formatBatchFileReady(
    lastOrder.fileName,
    lastOrder.batchIndex ?? 1,
    maxFiles,
    lastOrder.pageCount,
    keyboardMode === 'ready',
    {
      pointLabel,
      totalAmountKopeks: batch.totalAmountKopeks,
      copies: lastOrder.copies,
    },
  )

  await adapter.sendText(target, text, {
    inlineKeyboard: fileStatusKeyboard(lastOrder.id, {
      withRemove: lastOrder.status !== OrderStatus.CALCULATING,
      keyboardMode,
      withCopies: lastOrder.status === OrderStatus.AWAITING_PAYMENT,
      copies: lastOrder.copies,
    }),
    batchKeyboard: keyboardMode,
  })
  return 'Назад'
}

export async function handleDisplayCodeMessage(
  target: MessengerReplyTarget,
  user: BotUser,
  code: string,
  adapter: MessengerAdapter,
): Promise<boolean> {
  if (!/^\d{2,4}$/.test(code.trim())) {
    return false
  }

  try {
    const point = await resolvePointByDisplayCode(code)
    await handlePointSelect(target, user, point.slug, adapter)
    return true
  } catch {
    await adapter.sendText(target, messages.MSG_POINT_NOT_FOUND)
    return true
  }
}

export async function resolveAutoBindPointId(
  userId: string,
  preferredSlug?: string | null,
  lastPointId?: string | null,
): Promise<string | null> {
  if (preferredSlug) {
    try {
      const point = await resolvePointBySlug(preferredSlug)
      return point.id
    } catch {
      // fall through
    }
  }

  if (lastPointId) {
    const point = await prisma.point.findUnique({ where: { id: lastPointId } })
    if (point?.isActive) {
      return point.id
    }
  }

  return null
}
