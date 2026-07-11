import { OrderStatus } from '@prisma/client'
import type { MessengerPlatform } from '@prisma/client'
import * as messages from './bot/messages'
import { formatPartnerPrintFailed } from './bot/partner-messages'
import { partnerRefundPayload } from './bot/keyboards'
import { canPartnerRefundOrder } from './refund-eligibility'
import { loadOrderForUser, notifyRefundCompleted } from './bot/core'
import type { BotUser } from './bot/types'
import { assertPartnerOwnsPoint } from './partner-auth'
import { notifyPartnerRefundRequest } from './partner-notify'
import { getOrderRefundEligibility } from './refund-eligibility'
import { refundTbankPaymentForOrder } from './payments/providers/tbank-acquiring'
import { prisma } from './prisma'

async function assertOrderFailedForRefund(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true },
  })
  if (!order) {
    throw createError({
      statusCode: 404,
      data: { error: 'Order not found', code: 'ORDER_NOT_FOUND' },
    })
  }
  if (order.status !== OrderStatus.FAILED) {
    throw createError({
      statusCode: 400,
      data: { error: 'Refund is only available after a print failure', code: 'INVALID_STATUS' },
    })
  }
}

export async function handleClientRefundRequest(user: BotUser, orderId: string): Promise<string> {
  const { order } = await loadOrderForUser(orderId, user)

  if (order.status !== OrderStatus.FAILED) {
    return 'Запросить возврат можно только после неудачной печати'
  }

  const eligibility = await getOrderRefundEligibility(order.id)
  if (!eligibility) {
    return 'Заказ не найден'
  }

  if (eligibility.alreadyRefunded) {
    return messages.MSG_REFUND_ALREADY_DONE
  }

  const fullOrder = await prisma.order.findUnique({
    where: { id: order.id },
    include: {
      user: true,
      point: { select: { name: true } },
    },
  })
  if (!fullOrder) {
    return 'Заказ не найден'
  }

  try {
    await notifyPartnerRefundRequest(fullOrder)
  } catch (error) {
    console.error('[refund] partner notify failed:', order.id, error)
  }

  if (eligibility.canRefundOnline) {
    return messages.formatRefundRequestSent(eligibility.amountKopeks)
  }

  return messages.MSG_REFUND_REQUEST_SENT_MANUAL
}

export async function handleClientBatchRefundRequest(user: BotUser, batchId: string): Promise<string> {
  const dbUser = await prisma.user.findFirst({
    where: {
      OR: [
        { telegramId: BigInt(user.externalId) },
        { maxUserId: BigInt(user.externalId) },
      ],
    },
  })
  if (!dbUser) {
    return 'Заказ не найден'
  }

  const batch = await prisma.orderBatch.findUnique({
    where: { id: batchId },
    include: {
      orders: {
        where: { status: OrderStatus.FAILED },
        orderBy: { batchIndex: 'asc' },
        take: 1,
      },
    },
  })

  if (!batch || batch.userId !== dbUser.id || batch.orders.length === 0) {
    return 'Нет заказов с ошибкой печати в этой пачке'
  }

  return handleClientRefundRequest(user, batch.orders[0]!.id)
}

export async function handlePartnerRefundRequest(
  platform: MessengerPlatform,
  userId: bigint,
  orderId: string,
): Promise<{ text: string, keyboard: import('./bot/types').InlineKeyboardButton[][] }> {
  const pointId = await resolvePartnerPointId(orderId)
  await assertPartnerOwnsPoint(platform, userId, pointId)
  await assertOrderFailedForRefund(orderId)

  const eligibility = await getOrderRefundEligibility(orderId)
  if (!eligibility) {
    throw new Error('Заказ не найден')
  }
  if (eligibility.alreadyRefunded) {
    return {
      text: messages.MSG_REFUND_ALREADY_DONE,
      keyboard: [],
    }
  }
  if (!eligibility.canRefundOnline) {
    throw new Error('Возврат через бота доступен только для онлайн-оплаты Т-Банк')
  }

  const shortId = orderId.slice(-6)
  return {
    text: messages.formatPartnerRefundConfirm(shortId, eligibility.amountKopeks),
    keyboard: [[
      { text: messages.BTN_PARTNER_REFUND_CONFIRM, callbackData: `partner_refund_confirm:${orderId}` },
      { text: messages.BTN_PARTNER_REFUND_CANCEL, callbackData: `partner_refund_cancel:${orderId}` },
    ]],
  }
}

export async function handlePartnerRefundConfirm(
  platform: MessengerPlatform,
  userId: bigint,
  orderId: string,
): Promise<{ text: string, keyboard: import('./bot/types').InlineKeyboardButton[][] }> {
  const pointId = await resolvePartnerPointId(orderId)
  await assertPartnerOwnsPoint(platform, userId, pointId)
  await assertOrderFailedForRefund(orderId)

  const eligibility = await getOrderRefundEligibility(orderId)
  if (!eligibility) {
    throw new Error('Заказ не найден')
  }
  if (eligibility.alreadyRefunded) {
    return {
      text: messages.formatPartnerRefundDone(eligibility.amountKopeks),
      keyboard: [],
    }
  }
  if (!eligibility.canRefundOnline) {
    throw new Error('Возврат через бота доступен только для онлайн-оплаты Т-Банк')
  }

  const result = await refundTbankPaymentForOrder(orderId)

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true },
  })
  if (order?.user) {
    try {
      await notifyRefundCompleted(order.user, result.amountKopeks)
    } catch (error) {
      console.error('[refund] client notify failed:', orderId, error)
    }
  }

  return {
    text: messages.formatPartnerRefundDone(result.amountKopeks),
    keyboard: [],
  }
}

export async function handlePartnerRefundCancel(orderId: string): Promise<{ text: string, keyboard: import('./bot/types').InlineKeyboardButton[][] }> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { point: { select: { name: true } } },
  })
  if (!order) {
    throw new Error('Заказ не найден')
  }

  const canRefund = await canPartnerRefundOrder(orderId)
  return {
    text: formatPartnerPrintFailed(order, order.errorMessage),
    keyboard: canRefund
      ? [[{ text: messages.BTN_PARTNER_REFUND, callbackData: partnerRefundPayload(orderId) }]]
      : [],
  }
}

async function resolvePartnerPointId(orderId: string): Promise<string> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { pointId: true },
  })
  if (!order) {
    throw new Error('Заказ не найден')
  }
  return order.pointId
}
