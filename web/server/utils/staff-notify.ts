import { PaymentMethod, type Order, type OrderBatch } from '@prisma/client'
import { InlineKeyboard, InputFile } from 'grammy'
import {
  formatStaffBatchOnSiteAwaitingPayment,
  formatStaffBatchTransferAwaitingConfirm,
  formatStaffOnSiteAwaitingPayment,
  formatStaffPrintFailed,
  formatStaffTransferAwaitingConfirm,
} from './bot/messages'
import { downloadOrderFile } from './blob'
import { getTransferPhone, maskTransferPhone } from './payment-config'
import {
  getStaffMaxUserId,
  getStaffTelegramChatId,
  isStaffChannelConfigured,
  isTerminalPaymentMode,
} from './payment-mode'
import type { MaxInlineKeyboardAttachment } from './max/types'
import { getMaxClient } from './max/client'

type OrderForStaff = Pick<Order, 'id' | 'fileName' | 'pageCount' | 'amountKopeks' | 'paymentConfirmedAt' | 'paymentMethod' | 'paymentClaimedAt' | 'batchId' | 'errorMessage'>
  & {
    user: {
      username?: string | null
      firstName?: string | null
      telegramId?: bigint | null
      maxUserId?: bigint | null
    }
    point: { name: string, transferPhone?: string | null, transferBankLabel?: string | null }
  }

type BatchForStaff = Pick<OrderBatch, 'id' | 'totalPages' | 'totalAmountKopeks' | 'paymentMethod' | 'paymentClaimedAt'>
  & {
    orders: Array<Pick<Order, 'fileName' | 'batchIndex'>>
    user: {
      username?: string | null
      firstName?: string | null
      telegramId?: bigint | null
      maxUserId?: bigint | null
    }
    point: { name: string, transferPhone?: string | null, transferBankLabel?: string | null }
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

async function notifyStaffTelegram(
  text: string,
  keyboard?: InlineKeyboard,
): Promise<void> {
  const chatId = getStaffTelegramChatId()
  if (!chatId) {
    return
  }

  const { getBot } = await import('./telegram/bot')
  const bot = getBot()
  await bot.api.sendMessage(chatId, text, keyboard ? { reply_markup: keyboard } : undefined)
}

async function notifyStaffMax(
  text: string,
  attachments?: MaxInlineKeyboardAttachment[],
): Promise<void> {
  const userId = getStaffMaxUserId()
  if (!userId) {
    return
  }

  const client = getMaxClient()
  await client.sendMessage({ userId }, text, attachments)
}

async function notifyStaffAll(
  text: string,
  telegramKeyboard?: InlineKeyboard,
  maxAttachment?: MaxInlineKeyboardAttachment,
): Promise<void> {
  const errors: Error[] = []

  try {
    await notifyStaffTelegram(text, telegramKeyboard)
  } catch (error) {
    errors.push(error instanceof Error ? error : new Error(String(error)))
  }

  try {
    await notifyStaffMax(text, maxAttachment ? [maxAttachment] : undefined)
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
  if (!isStaffChannelConfigured()) {
    console.warn(
      '[staff] STAFF_TELEGRAM_CHAT_ID / STAFF_MAX_USER_ID are not set — skipping staff notification',
    )
    return
  }
  if (!order.paymentMethod) {
    return
  }

  let staffText: string
  if (order.paymentMethod === PaymentMethod.SBP_TRANSFER) {
    const phone = getTransferPhone({ transferPhone: order.point.transferPhone ?? null, transferBankLabel: order.point.transferBankLabel ?? null })
    staffText = formatStaffTransferAwaitingConfirm({
      ...order,
      transferPhoneMasked: phone ? maskTransferPhone(phone) : '***',
    })
  } else {
    staffText = formatStaffOnSiteAwaitingPayment(order)
  }

  await notifyStaffAll(staffText, telegramStaffKeyboard(order), maxStaffKeyboard(order))
}

export async function notifyStaffBatchPaymentPending(batch: BatchForStaff): Promise<void> {
  if (!isTerminalPaymentMode()) {
    return
  }
  if (!isStaffChannelConfigured()) {
    console.warn(
      '[staff] STAFF_TELEGRAM_CHAT_ID / STAFF_MAX_USER_ID are not set — skipping staff notification',
    )
    return
  }
  if (!batch.paymentMethod) {
    return
  }

  let staffText: string
  if (batch.paymentMethod === PaymentMethod.SBP_TRANSFER) {
    const phone = getTransferPhone({ transferPhone: batch.point.transferPhone ?? null, transferBankLabel: batch.point.transferBankLabel ?? null })
    staffText = formatStaffBatchTransferAwaitingConfirm({
      ...batch,
      transferPhoneMasked: phone ? maskTransferPhone(phone) : '***',
    })
  } else {
    staffText = formatStaffBatchOnSiteAwaitingPayment(batch)
  }

  await notifyStaffAll(staffText, telegramBatchKeyboard(batch.id), maxBatchKeyboard(batch.id))
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
  if (!isTerminalPaymentMode() || !isStaffChannelConfigured() || order.batchId) {
    return
  }

  const shortId = order.id.slice(-6)
  const text = `✅ Оплата по заказу #${shortId} принята.\n🖨 Печать запущена.`
  await notifyStaffAll(text)
}

export async function notifyStaffPrintFailed(
  order: OrderForStaff & { filePath: string },
): Promise<void> {
  if (!isStaffChannelConfigured()) {
    console.warn(
      '[staff] STAFF_TELEGRAM_CHAT_ID / STAFF_MAX_USER_ID are not set — skipping print failure notification',
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

  const errors: Error[] = []

  const chatId = getStaffTelegramChatId()
  if (chatId) {
    try {
      const { getBot } = await import('./telegram/bot')
      const bot = getBot()
      if (fileBuffer) {
        await bot.api.sendDocument(
          chatId,
          new InputFile(fileBuffer, order.fileName),
          { caption: text, reply_markup: tgKeyboard },
        )
      } else {
        await bot.api.sendMessage(chatId, text, { reply_markup: tgKeyboard })
      }
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)))
    }
  }

  const maxUserId = getStaffMaxUserId()
  if (maxUserId) {
    try {
      const client = getMaxClient()
      if (fileBuffer) {
        await client.sendFileMessage(
          { userId: maxUserId },
          text,
          order.fileName,
          fileBuffer,
          [maxKeyboard],
        )
      } else {
        await client.sendMessage({ userId: maxUserId }, text, [maxKeyboard])
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
