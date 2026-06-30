import { PaymentMethod, type Order, type OrderBatch } from '@prisma/client'
import { InlineKeyboard, InputFile } from 'grammy'
import {
  formatStaffBatchOnSiteAwaitingPayment,
  formatStaffBatchPaymentConfirmed,
  formatStaffBatchTransferAwaitingConfirm,
  formatStaffOnSiteAwaitingPayment,
  formatStaffOrderPaymentConfirmed,
  formatStaffPrintFailed,
  formatStaffTransferAwaitingConfirm,
} from './bot/messages'
import { downloadOrderFile } from './blob'
import { getTransferPhone, maskTransferPhone } from './payment-config'
import { isTerminalPaymentMode } from './payment-mode'
import type { MaxInlineKeyboardAttachment } from './max/types'
import { getMaxClient } from './max/client'
import {
  getMaxStaffUserIds,
  getTelegramStaffChatIds,
  hasStaffNotifyTargets,
} from './staff-auth'

type OrderForStaff = Pick<Order, 'id' | 'fileName' | 'pageCount' | 'amountKopeks' | 'paymentConfirmedAt' | 'paymentMethod' | 'paymentClaimedAt' | 'batchId' | 'errorMessage' | 'pointId'>
  & {
    user: {
      username?: string | null
      firstName?: string | null
      telegramId?: bigint | null
      maxUserId?: bigint | null
    }
    point: { name: string, transferPhone?: string | null, transferBankLabel?: string | null, paymentMethodsEnabled?: PaymentMethod[] }
  }

type BatchForStaff = Pick<OrderBatch, 'id' | 'totalPages' | 'totalAmountKopeks' | 'paymentMethod' | 'paymentClaimedAt' | 'pointId'>
  & {
    orders: Array<Pick<Order, 'fileName' | 'batchIndex'>>
    user: {
      username?: string | null
      firstName?: string | null
      telegramId?: bigint | null
      maxUserId?: bigint | null
    }
    point: { name: string, transferPhone?: string | null, transferBankLabel?: string | null, paymentMethodsEnabled?: PaymentMethod[] }
  }

function telegramStaffKeyboard(order: Pick<Order, 'id' | 'paymentConfirmedAt'>) {
  const keyboard = new InlineKeyboard()
  if (!order.paymentConfirmedAt) {
    keyboard.text('✅ Оплата получена', `staff_pay:${order.id}`)
  } else {
    keyboard.text('🖨 Печать', `staff_print:${order.id}`)
  }
  return keyboard
}

function telegramBatchKeyboard(batchId: string) {
  return new InlineKeyboard().text('✅ Оплатить пачку', `staff_batch_confirm:${batchId}`)
}

function maxStaffKeyboard(order: Pick<Order, 'id' | 'paymentConfirmedAt'>): MaxInlineKeyboardAttachment {
  const buttons: MaxInlineKeyboardAttachment['payload']['buttons'] = []
  if (!order.paymentConfirmedAt) {
    buttons.push([{
      type: 'callback',
      text: '✅ Оплата получена',
      payload: `staff_pay:${order.id}`,
      intent: 'default',
    }])
  } else {
    buttons.push([{
      type: 'callback',
      text: '🖨 Печать',
      payload: `staff_print:${order.id}`,
      intent: 'default',
    }])
  }
  return {
    type: 'inline_keyboard',
    payload: { buttons },
  }
}

function maxBatchKeyboard(batchId: string): MaxInlineKeyboardAttachment {
  return {
    type: 'inline_keyboard',
    payload: {
      buttons: [[{
        type: 'callback',
        text: '✅ Оплатить пачку',
        payload: `staff_batch_confirm:${batchId}`,
        intent: 'default',
      }]],
    },
  }
}

function telegramStaffManualPrintKeyboard(orderId: string) {
  return new InlineKeyboard().text('✅ Печать готова', `staff_manual_print:${orderId}`)
}

function maxStaffManualPrintKeyboard(orderId: string): MaxInlineKeyboardAttachment {
  return {
    type: 'inline_keyboard',
    payload: {
      buttons: [[{
        type: 'callback',
        text: '✅ Печать готова',
        payload: `staff_manual_print:${orderId}`,
        intent: 'default',
      }]],
    },
  }
}

async function notifyStaffTelegramTargets(
  chatIds: number[],
  text: string,
  keyboard?: InlineKeyboard,
): Promise<void> {
  if (chatIds.length === 0) {
    return
  }

  const { getBot } = await import('./telegram/bot')
  const bot = getBot()
  for (const chatId of chatIds) {
    await bot.api.sendMessage(chatId, text, keyboard ? { reply_markup: keyboard } : undefined)
  }
}

async function notifyStaffMaxTargets(
  userIds: number[],
  text: string,
  attachments?: MaxInlineKeyboardAttachment[],
): Promise<void> {
  if (userIds.length === 0) {
    return
  }

  const client = getMaxClient()
  for (const userId of userIds) {
    await client.sendMessage({ userId }, text, attachments)
  }
}

async function notifyStaffAllForPoint(
  pointId: string,
  text: string,
  telegramKeyboard?: InlineKeyboard,
  maxAttachment?: MaxInlineKeyboardAttachment,
): Promise<void> {
  const tgChatIds = await getTelegramStaffChatIds(pointId)
  const maxUserIds = await getMaxStaffUserIds(pointId)

  if (tgChatIds.length === 0 && maxUserIds.length === 0) {
    console.warn(
      `[staff] no staff channels for point ${pointId} — skipping notification`,
    )
    return
  }

  const errors: Error[] = []

  try {
    await notifyStaffTelegramTargets(tgChatIds, text, telegramKeyboard)
  } catch (error) {
    errors.push(error instanceof Error ? error : new Error(String(error)))
  }

  try {
    await notifyStaffMaxTargets(maxUserIds, text, maxAttachment ? [maxAttachment] : undefined)
  } catch (error) {
    errors.push(error instanceof Error ? error : new Error(String(error)))
  }

  if (errors.length > 0) {
    console.error('[staff] notify failed:', errors)
    throw errors[0]
  }
}

export async function notifyStaffOrderPaymentPending(order: OrderForStaff): Promise<void> {
  if (!isTerminalPaymentMode() || order.batchId) {
    return
  }
  if (!(await hasStaffNotifyTargets(order.pointId))) {
    console.warn(
      '[staff] no staff channels configured for point — skipping staff notification',
    )
    return
  }
  if (!order.paymentMethod) {
    return
  }

  let staffText: string
  if (order.paymentMethod === PaymentMethod.SBP_TRANSFER) {
    const phone = getTransferPhone(order.point)
    staffText = formatStaffTransferAwaitingConfirm({
      ...order,
      transferPhoneMasked: phone ? maskTransferPhone(phone) : '***',
    })
  } else {
    staffText = formatStaffOnSiteAwaitingPayment(order)
  }

  await notifyStaffAllForPoint(
    order.pointId,
    staffText,
    telegramStaffKeyboard(order),
    maxStaffKeyboard(order),
  )
}

export async function notifyStaffBatchPaymentPending(batch: BatchForStaff): Promise<void> {
  if (!isTerminalPaymentMode()) {
    return
  }
  if (!(await hasStaffNotifyTargets(batch.pointId))) {
    console.warn(
      '[staff] no staff channels configured for point — skipping staff notification',
    )
    return
  }
  if (!batch.paymentMethod) {
    return
  }

  let staffText: string
  if (batch.paymentMethod === PaymentMethod.SBP_TRANSFER) {
    const phone = getTransferPhone(batch.point)
    staffText = formatStaffBatchTransferAwaitingConfirm({
      ...batch,
      transferPhoneMasked: phone ? maskTransferPhone(phone) : '***',
    })
  } else {
    staffText = formatStaffBatchOnSiteAwaitingPayment(batch)
  }

  await notifyStaffAllForPoint(
    batch.pointId,
    staffText,
    telegramBatchKeyboard(batch.id),
    maxBatchKeyboard(batch.id),
  )
}

/** @deprecated Use notifyStaffOrderPaymentPending */
export async function notifyStaffOrderAwaitingPayment(order: OrderForStaff): Promise<void> {
  await notifyStaffOrderPaymentPending(order)
}

/** @deprecated Use notifyStaffBatchPaymentPending */
export async function notifyStaffBatchAwaitingPayment(batch: BatchForStaff): Promise<void> {
  await notifyStaffBatchPaymentPending(batch)
}

export async function notifyStaffPaymentConfirmed(order: OrderForStaff): Promise<void> {
  if (!isTerminalPaymentMode() || order.batchId) {
    return
  }
  if (!(await hasStaffNotifyTargets(order.pointId))) {
    return
  }

  const shortId = order.id.slice(-6)
  const text = formatStaffOrderPaymentConfirmed(shortId, order.amountKopeks, order.fileName)
  await notifyStaffAllForPoint(order.pointId, text)
}

export async function notifyStaffBatchPaymentConfirmed(batch: BatchForStaff): Promise<void> {
  if (!isTerminalPaymentMode()) {
    return
  }
  if (!(await hasStaffNotifyTargets(batch.pointId))) {
    return
  }

  const shortId = batch.id.slice(-6)
  const text = formatStaffBatchPaymentConfirmed(
    shortId,
    batch.orders.length,
    batch.totalAmountKopeks,
  )
  await notifyStaffAllForPoint(batch.pointId, text)
}

export async function notifyStaffPrintFailed(
  order: OrderForStaff & { filePath: string },
): Promise<void> {
  if (!(await hasStaffNotifyTargets(order.pointId))) {
    console.warn(
      '[staff] no staff channels configured for point — skipping print failure notification',
    )
    return
  }

  const text = formatStaffPrintFailed(order, order.errorMessage)
  const tgKeyboard = telegramStaffManualPrintKeyboard(order.id)
  const maxKeyboard = maxStaffManualPrintKeyboard(order.id)

  let fileBuffer: Buffer | null = null
  if (order.filePath?.trim()) {
    try {
      fileBuffer = await downloadOrderFile(order.filePath)
    } catch (error) {
      console.error('[staff] failed to load order file for manual print:', order.id, error)
    }
  }

  const tgChatIds = await getTelegramStaffChatIds(order.pointId)
  const maxUserIds = await getMaxStaffUserIds(order.pointId)
  const errors: Error[] = []

  if (tgChatIds.length > 0) {
    try {
      const { getBot } = await import('./telegram/bot')
      const bot = getBot()
      for (const chatId of tgChatIds) {
        if (fileBuffer) {
          await bot.api.sendDocument(
            chatId,
            new InputFile(fileBuffer, order.fileName),
            { caption: text, reply_markup: tgKeyboard },
          )
        } else {
          await bot.api.sendMessage(chatId, text, { reply_markup: tgKeyboard })
        }
      }
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)))
    }
  }

  if (maxUserIds.length > 0) {
    try {
      const client = getMaxClient()
      for (const userId of maxUserIds) {
        if (fileBuffer) {
          await client.sendFileMessage(
            { userId },
            text,
            order.fileName,
            fileBuffer,
            [maxKeyboard],
          )
        } else {
          await client.sendMessage({ userId }, text, [maxKeyboard])
        }
      }
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)))
    }
  }

  if (errors.length > 0) {
    console.error('[staff] print failure notify failed:', errors)
    throw errors[0]
  }
}
