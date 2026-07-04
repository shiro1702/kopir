import { PaymentMethod } from '@prisma/client'
import type { Order, OrderBatch } from '@prisma/client'
import {
  getEnabledPaymentMethods,
  getTransferBankLabel,
  getTransferPhone,
} from '../payment-config'
import { isTbankConfigured } from '../tbank-config'
import {
  claimPayment,
  resetPaymentMethod,
  selectPaymentMethod,
} from '../payments/service'
import {
  checkTbankPaymentStatus,
  initPayment,
  type TbankPayChannel,
} from '../payments/providers/tbank-acquiring'
import { prisma } from '../prisma'
import {
  onSitePaymentKeyboard,
  onlinePaymentCheckKeyboard,
  onlinePaymentLinkKeyboard,
  paymentMethodKeyboard,
  transferClaimedKeyboard,
  type PayMethodCallback,
} from './keyboards'
import * as messages from './messages'
import type {
  BotUser,
  ClientCallbackResult,
  MessengerAdapter,
  MessengerReplyTarget,
} from './types'

function mapPayMethod(method: PayMethodCallback): PaymentMethod {
  if (method === 'sbp_transfer') return PaymentMethod.SBP_TRANSFER
  if (method === 'tbank_sbp') return PaymentMethod.TBANK_SBP
  if (method === 'tbank_card' || method === 'tbank_online') {
    return PaymentMethod.TBANK_ONLINE
  }
  return PaymentMethod.ON_SITE
}

function tbankChannelFromMethod(method: PayMethodCallback): TbankPayChannel {
  if (method === 'tbank_card') return 'card'
  return 'sbp'
}

function isTbankPayMethod(method: PayMethodCallback): boolean {
  return method === 'tbank_sbp' || method === 'tbank_card' || method === 'tbank_online'
}

async function sendWithInlineKeyboard(
  target: MessengerReplyTarget,
  adapter: MessengerAdapter,
  text: string,
  inlineKeyboard: ReturnType<typeof paymentMethodKeyboard>,
): Promise<void> {
  await adapter.sendText(target, text, { inlineKeyboard })
}

export async function sendPaymentMethodChoiceForBatch(
  target: MessengerReplyTarget,
  adapter: MessengerAdapter,
  batch: OrderBatch & {
    orders: Array<Pick<Order, 'fileName'>>
    point?: { transferPhone: string | null, transferBankLabel: string | null }
  },
): Promise<void> {
  const point = batch.point ?? await prisma.point.findUniqueOrThrow({ where: { id: batch.pointId } })
  const methods = getEnabledPaymentMethods(point)
  const shortId = batch.id.slice(-6)
  const summary = messages.formatBatchSummary(
    batch.orders.map((o) => o.fileName),
    batch.totalPages,
    batch.totalAmountKopeks,
  )
  const choice = messages.formatPaymentMethodChoice(batch.totalAmountKopeks, shortId)

  if (methods.length === 0) {
    await adapter.sendText(
      target,
      `${summary}\n\nОплата временно недоступна. Обратитесь к сотруднику копицентра.`,
    )
    return
  }

  await sendWithInlineKeyboard(
    target,
    adapter,
    `${summary}\n\n${choice}`,
    paymentMethodKeyboard(batch.id, methods),
  )
}

export async function sendPaymentMethodChoiceForOrder(
  target: MessengerReplyTarget,
  adapter: MessengerAdapter,
  order: Order & {
    point: { transferPhone: string | null, transferBankLabel: string | null }
  },
): Promise<void> {
  const methods = getEnabledPaymentMethods(order.point)
  const shortId = order.id.slice(-6)
  const quote = messages.formatQuote(order.fileName, order.pageCount, order.amountKopeks)
  const choice = messages.formatPaymentMethodChoice(order.amountKopeks, shortId)

  if (methods.length === 0) {
    await adapter.sendText(
      target,
      `${quote}\n\nОплата временно недоступна. Обратитесь к сотруднику копицентра.`,
    )
    return
  }

  await sendWithInlineKeyboard(
    target,
    adapter,
    `${quote}\n\n${choice}`,
    paymentMethodKeyboard(order.id, methods),
  )
}

async function sendTbankPaymentUi(
  target: MessengerReplyTarget,
  adapter: MessengerAdapter,
  entityId: string,
  shortId: string,
  amountKopeks: number,
  init: Awaited<ReturnType<typeof initPayment>>,
): Promise<ClientCallbackResult> {
  const isCard = init.channel === 'card'
  const autoOpenLink = target.platform === 'telegram'
  const text = isCard
    ? (autoOpenLink
      ? messages.formatOnlineCardAfterOpen(amountKopeks, shortId)
      : messages.formatOnlineCardWithLink(amountKopeks, shortId))
    : (autoOpenLink
      ? messages.formatOnlineSbpAfterOpen(amountKopeks, shortId)
      : messages.formatOnlineSbpWithLink(amountKopeks, shortId))
  const keyboard = autoOpenLink
    ? onlinePaymentCheckKeyboard(entityId, init.paymentId)
    : onlinePaymentLinkKeyboard(entityId, init.payUrl, init.paymentId)

  await adapter.sendText(target, text, { inlineKeyboard: keyboard })

  if (autoOpenLink) {
    return {
      toast: isCard ? 'Открываем оплату картой' : 'Открываем СБП',
      callbackAnswer: { url: init.payUrl },
    }
  }

  return { toast: 'Ожидаем оплату' }
}

export async function handlePaymentMethodChoice(
  target: MessengerReplyTarget,
  user: BotUser,
  method: PayMethodCallback,
  entityId: string,
  adapter: MessengerAdapter,
): Promise<ClientCallbackResult> {
  const result = await selectPaymentMethod(entityId, mapPayMethod(method), user.externalId)
  const shortId = entityId.slice(-6)

  if (isTbankPayMethod(method)) {
    if (!isTbankConfigured()) {
      throw createError({
        statusCode: 400,
        data: { error: 'Online payment is not configured', code: 'TBANK_NOT_CONFIGURED' },
      })
    }

    const amountKopeks = result.kind === 'batch'
      ? result.batch.totalAmountKopeks
      : result.order.amountKopeks
    const point = result.kind === 'batch'
      ? result.batch.point
      : result.order.point

    const init = await initPayment({
      kind: result.kind,
      entityId,
      shortId,
      amountKopeks,
      paymentMethod: result.method,
      point,
      user: result.kind === 'batch' ? result.batch.user : result.order.user,
      batch: result.kind === 'batch' ? result.batch : undefined,
      order: result.kind === 'order' ? result.order : undefined,
    }, tbankChannelFromMethod(method))

    return sendTbankPaymentUi(target, adapter, entityId, shortId, amountKopeks, init)
  }

  if (result.kind === 'batch') {
    const batch = result.batch
    const point = batch.point ?? await prisma.point.findUniqueOrThrow({ where: { id: batch.pointId } })
    if (result.method === PaymentMethod.SBP_TRANSFER) {
      const phone = getTransferPhone(point)
      if (!phone) {
        throw createError({
          statusCode: 400,
          data: { error: 'Transfer phone is not configured', code: 'TRANSFER_NOT_CONFIGURED' },
        })
      }
      const text = messages.formatTransferInstructions(
        batch.totalAmountKopeks,
        shortId,
        phone,
        getTransferBankLabel(point),
      )
      await sendWithInlineKeyboard(target, adapter, text, transferClaimedKeyboard(batch.id))
      return { toast: 'Способ выбран' }
    }

    const text = messages.formatOnSiteInstructions(batch.totalAmountKopeks, shortId)
    await sendWithInlineKeyboard(target, adapter, text, onSitePaymentKeyboard(batch.id))
    return { toast: 'Способ выбран' }
  }

  const order = result.order
  if (result.method === PaymentMethod.SBP_TRANSFER) {
    const phone = getTransferPhone(order.point)
    if (!phone) {
      throw createError({
        statusCode: 400,
        data: { error: 'Transfer phone is not configured', code: 'TRANSFER_NOT_CONFIGURED' },
      })
    }
    const text = messages.formatTransferInstructions(
      order.amountKopeks,
      shortId,
      phone,
      getTransferBankLabel(order.point),
    )
    await sendWithInlineKeyboard(target, adapter, text, transferClaimedKeyboard(order.id))
    return { toast: 'Способ выбран' }
  }

  const text = messages.formatOnSiteInstructions(order.amountKopeks, shortId)
  await sendWithInlineKeyboard(target, adapter, text, onSitePaymentKeyboard(order.id))
  return { toast: 'Способ выбран' }
}

export async function handlePaymentCheckStatus(
  target: MessengerReplyTarget,
  user: BotUser,
  paymentId: string,
  adapter: MessengerAdapter,
): Promise<string> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } })
  const shortId = (payment?.batchId ?? payment?.orderId ?? paymentId).slice(-6)

  const result = await checkTbankPaymentStatus(paymentId, user.externalId)

  if (result.alreadyConfirmed) {
    await adapter.sendText(target, messages.formatOnlinePaymentConfirmed(shortId))
    return 'Оплата подтверждена'
  }

  if (result.pending) {
    await adapter.sendText(target, messages.formatOnlinePaymentPending(shortId))
    return 'Оплата ещё не поступила'
  }

  await adapter.sendText(target, messages.formatOnlinePaymentConfirmed(shortId))
  return 'Оплата подтверждена'
}

export async function handlePaymentClaimed(
  target: MessengerReplyTarget,
  user: BotUser,
  entityId: string,
  adapter: MessengerAdapter,
): Promise<string> {
  await claimPayment(entityId, user.externalId)
  const shortId = entityId.slice(-6)
  await adapter.sendText(target, messages.formatAwaitingStaffConfirm(shortId))
  return 'Ждём подтверждения'
}

export async function handlePaymentChangeMethod(
  target: MessengerReplyTarget,
  user: BotUser,
  entityId: string,
  adapter: MessengerAdapter,
): Promise<string> {
  const result = await resetPaymentMethod(entityId, user.externalId)

  if (result.kind === 'batch') {
    await sendPaymentMethodChoiceForBatch(target, adapter, result.batch)
    return 'Выберите способ оплаты'
  }

  await sendPaymentMethodChoiceForOrder(target, adapter, result.order)
  return 'Выберите способ оплаты'
}


export async function sendPaymentMethodChoiceToUser(
  user: { telegramId?: bigint | null, maxUserId?: bigint | null },
  order: Order & {
    point: { transferPhone: string | null, transferBankLabel: string | null }
  },
): Promise<void> {
  const methods = getEnabledPaymentMethods(order.point)
  const shortId = order.id.slice(-6)
  const quote = messages.formatQuote(order.fileName, order.pageCount, order.amountKopeks)
  const choice = messages.formatPaymentMethodChoice(order.amountKopeks, shortId)
  const text = methods.length === 0
    ? `${quote}\n\nОплата временно недоступна. Обратитесь к сотруднику копицентра.`
    : `${quote}\n\n${choice}`
  const keyboard = methods.length > 0 ? paymentMethodKeyboard(order.id, methods) : undefined

  const errors: Error[] = []

  if (user.telegramId) {
    try {
      const { sendTelegramStatusMessage } = await import('../telegram/client')
      await sendTelegramStatusMessage(Number(user.telegramId), text, keyboard ? { inlineKeyboard: keyboard } : undefined)
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)))
    }
  }

  if (user.maxUserId) {
    try {
      const { getMaxClient } = await import('../max/client')
      const client = getMaxClient()
      const attachments = keyboard
        ? [{
            type: 'inline_keyboard',
            payload: {
              buttons: keyboard.map((row) =>
                row.map((btn) => ({
                  type: btn.url ? 'link' : 'callback',
                  text: btn.text,
                  ...(btn.url ? { url: btn.url } : { payload: btn.callbackData ?? '' }),
                  intent: 'default',
                })),
              ),
            },
          }]
        : undefined
      await client.sendMessage({ userId: Number(user.maxUserId) }, text, attachments)
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)))
    }
  }

  if (errors.length > 0) {
    console.error('[payment] notify choice failed:', errors)
    throw errors[0]
  }
}
