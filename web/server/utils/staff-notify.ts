import { PaymentMethod, type Order, type OrderBatch } from '@prisma/client'
import { InlineKeyboard, InputFile } from 'grammy'
import {
  formatStaffBatchOnSiteAwaitingPayment,
  formatStaffBatchPaymentConfirmed,
  formatStaffBatchTransferAwaitingConfirm,
  formatStaffOnSiteAwaitingPayment,
  formatStaffOrderPaymentConfirmed,
  formatStaffOrderSourceCaption,
  formatStaffPrintAutoRetry,
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

type OrderForStaff = Pick<Order, 'id' | 'fileName' | 'pageCount' | 'amountKopeks' | 'paymentConfirmedAt' | 'paymentMethod' | 'paymentClaimedAt' | 'batchId' | 'errorMessage'> & {
  pointId: string
  copies?: number
  filePath?: string | null
  batchIndex?: number | null
  user: {
    username?: string | null
    firstName?: string | null
    telegramId?: bigint | null
    maxUserId?: bigint | null
  }
  point: { name: string, transferPhone?: string | null, transferBankLabel?: string | null, paymentMethodsEnabled?: PaymentMethod[] }
}

type BatchForStaff = Pick<OrderBatch, 'id' | 'totalPages' | 'totalAmountKopeks' | 'paymentMethod' | 'paymentClaimedAt'> & {
  pointId: string
  orders: Array<Pick<Order, 'id' | 'fileName' | 'filePath' | 'batchIndex' | 'pageCount'> & { copies?: number }>
  user: {
    username?: string | null
    firstName?: string | null
    telegramId?: bigint | null
    maxUserId?: bigint | null
  }
  point: { name: string, transferPhone?: string | null, transferBankLabel?: string | null, paymentMethodsEnabled?: PaymentMethod[] }
}

type OrderSourceForStaff = Pick<Order, 'id' | 'fileName' | 'filePath' | 'pageCount'> & {
  pointId: string
  copies?: number
  batchId?: string | null
  batchIndex?: number | null
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
  return new InlineKeyboard()
    .text('🔄 Попробовать снова', `staff_retry_print:${orderId}`)
    .row()
    .text('✅ Печать готова', `staff_manual_print:${orderId}`)
}

function maxStaffManualPrintKeyboard(orderId: string): MaxInlineKeyboardAttachment {
  return {
    type: 'inline_keyboard',
    payload: {
      buttons: [
        [{
          type: 'callback',
          text: '🔄 Попробовать снова',
          payload: `staff_retry_print:${orderId}`,
          intent: 'default',
        }],
        [{
          type: 'callback',
          text: '✅ Печать готова',
          payload: `staff_manual_print:${orderId}`,
          intent: 'default',
        }],
      ],
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

async function loadOrderFileBuffer(
  order: { id: string, filePath?: string | null },
): Promise<Buffer | null> {
  if (!order.filePath?.trim()) {
    return null
  }
  try {
    return await downloadOrderFile(order.filePath)
  } catch (error) {
    console.error('[staff] failed to load order file:', order.id, error)
    return null
  }
}

async function sendOrderDocumentToStaff(
  pointId: string,
  order: { id: string, fileName: string, filePath?: string | null },
  caption: string,
  telegramKeyboard?: InlineKeyboard,
  maxKeyboard?: MaxInlineKeyboardAttachment,
): Promise<void> {
  const fileBuffer = await loadOrderFileBuffer(order)
  const tgChatIds = await getTelegramStaffChatIds(pointId)
  const maxUserIds = await getMaxStaffUserIds(pointId)

  if (tgChatIds.length === 0 && maxUserIds.length === 0) {
    console.warn(
      `[staff] no staff channels for point ${pointId} — skipping document`,
    )
    return
  }

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
            {
              caption,
              ...(telegramKeyboard ? { reply_markup: telegramKeyboard } : {}),
            },
          )
        } else {
          await bot.api.sendMessage(
            chatId,
            caption,
            telegramKeyboard ? { reply_markup: telegramKeyboard } : undefined,
          )
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
            caption,
            order.fileName,
            fileBuffer,
            maxKeyboard ? [maxKeyboard] : undefined,
          )
        } else {
          await client.sendMessage(
            { userId },
            caption,
            maxKeyboard ? [maxKeyboard] : undefined,
          )
        }
      }
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)))
    }
  }

  if (errors.length > 0) {
    console.error('[staff] document notify failed:', errors)
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
  if (order.batchId) {
    return
  }
  if (!(await hasStaffNotifyTargets(order.pointId))) {
    return
  }

  const shortId = order.id.slice(-6)
  const text = formatStaffOrderPaymentConfirmed(shortId, order.amountKopeks, order.fileName)
  await sendOrderDocumentToStaff(order.pointId, order, text)
}

export async function notifyStaffBatchPaymentConfirmed(batch: BatchForStaff): Promise<void> {
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

  for (const order of batch.orders) {
    try {
      const caption = formatStaffOrderSourceCaption({
        ...order,
        batchId: batch.id,
      })
      await sendOrderDocumentToStaff(batch.pointId, order, caption)
    } catch (error) {
      console.error('[staff] batch source file notify failed:', order.id, error)
    }
  }
}

/** Send source file to staff as soon as print is queued (online + terminal). */
export async function notifyStaffOrderQueuedWithSource(
  order: OrderSourceForStaff,
): Promise<void> {
  if (!(await hasStaffNotifyTargets(order.pointId))) {
    return
  }

  const caption = formatStaffOrderSourceCaption(order)
  await sendOrderDocumentToStaff(order.pointId, order, caption)
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
  await sendOrderDocumentToStaff(
    order.pointId,
    order,
    text,
    telegramStaffManualPrintKeyboard(order.id),
    maxStaffManualPrintKeyboard(order.id),
  )
}

export async function notifyStaffPrintAutoRetry(
  order: OrderForStaff,
): Promise<void> {
  if (!(await hasStaffNotifyTargets(order.pointId))) {
    return
  }

  const text = formatStaffPrintAutoRetry(order, order.errorMessage)
  await notifyStaffAllForPoint(order.pointId, text)
}
