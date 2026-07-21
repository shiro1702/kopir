import { OrderStatus, type Order } from '@prisma/client'
import {
  bindBatchToPoint,
  getActiveBatchOrders,
  getActiveCollectingBatch,
  getBatchKeyboardMode,
  getBatchMaxFiles,
} from '../batch'
import { yandexMapsRoute } from '../navigation-links'
import { getPointOrderEligibility } from '../point-availability'
import { toPublicPointPayload } from '../public-point'
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
import { getUserGeoCoords, setUserGeoCoords } from './preferences'
import { getPointClientLinksConfig } from '../point-links'
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

function miniAppPointsUrl(): string | null {
  const base = getPointClientLinksConfig().siteUrl.replace(/\/$/, '')
  if (!base) {
    return null
  }
  return `${base}/miniapp/points`
}

async function mapPointsForList(
  target: MessengerReplyTarget,
  points: Awaited<ReturnType<typeof listActivePoints>>,
) {
  const userCoords = getUserGeoCoords(target.platform, target.chatId)
  const mapped = points.map((point) => {
    const payload = toPublicPointPayload(point, userCoords
      ? { userLat: userCoords.lat, userLng: userCoords.lng }
      : undefined)
    return {
      slug: point.slug,
      name: point.name,
      displayCode: point.displayCode,
      lastSeenAt: point.lastSeenAt,
      statusText: payload.statusText,
      canSelect: payload.canSelect,
      distanceKm: payload.distanceKm,
    }
  })

  mapped.sort((a, b) => {
    if (a.canSelect !== b.canSelect) {
      return a.canSelect ? -1 : 1
    }
    if (a.distanceKm != null && b.distanceKm != null) {
      return a.distanceKm - b.distanceKm
    }
    return a.name.localeCompare(b.name, 'ru')
  })

  return mapped
}

async function refreshBatchFileCards(
  batchId: string,
  adapter: MessengerAdapter,
  target: MessengerReplyTarget,
  platform: MessengerPlatform,
): Promise<void> {
  const batch = await prisma.orderBatch.findUnique({
    where: { id: batchId },
    include: { point: { select: { name: true, displayCode: true, lat: true, lng: true } } },
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
    const routeUrl = batch.point?.lat != null && batch.point?.lng != null
      ? yandexMapsRoute(batch.point.lat, batch.point.lng)
      : null
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
        routeUrl,
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

async function buildLastOrderFileReadyText(
  batchId: string,
  pointLabel: string,
): Promise<{ text: string, lastOrder: Order, keyboardMode: Awaited<ReturnType<typeof getBatchKeyboardMode>> } | null> {
  const keyboardMode = await getBatchKeyboardMode(batchId)
  const orders = await getActiveBatchOrders(batchId)
  const lastOrder = orders[orders.length - 1]
  if (!lastOrder) {
    return null
  }

  const batch = await prisma.orderBatch.findUnique({
    where: { id: batchId },
    include: { point: { select: { lat: true, lng: true } } },
  })
  const maxFiles = getBatchMaxFiles()
  const routeUrl = batch?.point?.lat != null && batch?.point?.lng != null
    ? yandexMapsRoute(batch.point.lat, batch.point.lng)
    : null
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
      routeUrl,
    },
  )

  return { text: fileText, lastOrder, keyboardMode }
}

async function sendBatchPointSelectedConfirmation(
  batchId: string,
  pointLabel: string,
  target: MessengerReplyTarget,
  adapter: MessengerAdapter,
  options?: PointSelectOptions,
): Promise<void> {
  const toast = messages.MSG_POINT_SELECTED(pointLabel)
  const fileReady = await buildLastOrderFileReadyText(batchId, pointLabel)

  if (!fileReady) {
    const text = `${toast}\n\n${messages.MSG_POINT_SELECTED_SEND_FILES}`
    if (options?.callbackMessage && adapter.editStatus) {
      await adapter.editStatus(target, options.callbackMessage, text, { removeInlineKeyboard: true })
    } else {
      await adapter.sendText(target, text, { clientMenu: true })
    }
    return
  }

  const { text: fileText, lastOrder, keyboardMode } = fileReady
  const statusOpts = {
    inlineKeyboard: fileStatusKeyboard(lastOrder.id, {
      withRemove: lastOrder.status !== OrderStatus.CALCULATING,
      keyboardMode,
      withCopies: lastOrder.status === OrderStatus.AWAITING_PAYMENT,
      copies: lastOrder.copies,
    }),
    batchKeyboard: keyboardMode,
  }

  if (target.platform === 'max' || !options?.callbackMessage) {
    await adapter.sendText(target, `${toast}\n\n${fileText}`, statusOpts)
    return
  }

  if (adapter.editStatus) {
    await adapter.editStatus(
      target,
      options.callbackMessage,
      `${toast}\n\n${messages.MSG_POINT_SELECTED_FILE_UPDATED}`,
      { removeInlineKeyboard: true },
    )
  }
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

  const mapped = await mapPointsForList(target, points)
  const totalPages = Math.max(1, Math.ceil(mapped.length / POINTS_PER_PAGE))
  const safePage = Math.min(page, totalPages - 1)
  const text = messages.formatPointListHeader(safePage, totalPages)
  const keyboard = pointSelectKeyboard(mapped, safePage)

  await adapter.sendText(target, text, { inlineKeyboard: keyboard })
  return 'Выберите точку…'
}

export async function handlePointChangeMenu(
  target: MessengerReplyTarget,
  adapter: MessengerAdapter,
): Promise<string> {
  await adapter.sendText(target, messages.formatPointChangeMenu(), {
    inlineKeyboard: pointChangeMenuKeyboard({ miniAppUrl: miniAppPointsUrl() }),
  })
  return 'Выберите способ…'
}

export async function handlePointGeoRequest(
  target: MessengerReplyTarget,
  adapter: MessengerAdapter,
): Promise<string> {
  if (target.platform === 'telegram') {
    const { sendTelegramLocationRequestKeyboard } = await import('../telegram/client')
    await sendTelegramLocationRequestKeyboard(Number(target.chatId), messages.MSG_POINT_GEO_PROMPT)
    return 'Отправьте геолокацию'
  }
  await adapter.sendText(target, messages.MSG_POINT_GEO_PROMPT)
  return 'Геолокация пока доступна в Telegram'
}

export async function handlePointLocation(
  target: MessengerReplyTarget,
  user: BotUser,
  coords: { lat: number, lng: number },
  adapter: MessengerAdapter,
): Promise<string> {
  setUserGeoCoords(target.platform, target.chatId, coords)
  await handlePointList(target, user, adapter, 0)
  return 'Точки отсортированы по расстоянию'
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
  const eligibility = getPointOrderEligibility(point)
  if (!eligibility.canAccept) {
    await adapter.sendText(target, eligibility.reason ?? messages.MSG_POINT_UNAVAILABLE, {
      inlineKeyboard: pointChangeMenuKeyboard({ miniAppUrl: miniAppPointsUrl() }),
    })
    return eligibility.reason ?? messages.MSG_POINT_UNAVAILABLE
  }

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

    try {
      await sendBatchPointSelectedConfirmation(batch.id, pointLabel, target, adapter, options)
    } catch (error) {
      console.error('[bot] point select confirmation failed:', error)
      await adapter.sendText(target, toast)
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

export async function handleWebAppPointSelect(
  target: MessengerReplyTarget,
  user: BotUser,
  slug: string,
  adapter: MessengerAdapter,
): Promise<string> {
  return handlePointSelect(target, user, slug, adapter)
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
      if (getPointOrderEligibility(point).canAccept) {
        return point.id
      }
    } catch {
      // fall through
    }
  }

  if (lastPointId) {
    const point = await prisma.point.findUnique({ where: { id: lastPointId } })
    if (point?.isActive && getPointOrderEligibility(point).canAccept) {
      return point.id
    }
  }

  return null
}
