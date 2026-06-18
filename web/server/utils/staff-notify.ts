import type { Order, OrderBatch } from '@prisma/client'
import { InlineKeyboard } from 'grammy'
import { formatStaffBatchAwaitingPayment, formatStaffOrderAwaitingPayment } from './bot/messages'
import {
  getStaffMaxUserId,
  getStaffTelegramChatId,
  isStaffChannelConfigured,
  isTerminalPaymentMode,
} from './payment-mode'
import type { MaxInlineKeyboardAttachment } from './max/types'
import { getMaxClient } from './max/client'

type OrderForStaff = Pick<Order, 'id' | 'fileName' | 'pageCount' | 'amountKopeks' | 'paymentConfirmedAt' | 'batchId'>
  & {
    user: {
      username?: string | null
      firstName?: string | null
      telegramId?: bigint | null
      maxUserId?: bigint | null
    }
    point: { name: string }
  }

type BatchForStaff = Pick<OrderBatch, 'id' | 'totalPages' | 'totalAmountKopeks'>
  & {
    orders: Array<Pick<Order, 'fileName' | 'batchIndex'>>
    user: {
      username?: string | null
      firstName?: string | null
      telegramId?: bigint | null
      maxUserId?: bigint | null
    }
    point: { name: string }
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

export async function notifyStaffOrderAwaitingPayment(order: OrderForStaff): Promise<void> {
  if (!isTerminalPaymentMode() || order.batchId) {
    return
  }

  if (!isStaffChannelConfigured()) {
    console.warn(
      '[staff] STAFF_TELEGRAM_CHAT_ID / STAFF_MAX_USER_ID are not set — skipping staff notification',
    )
    return
  }

  const text = formatStaffOrderAwaitingPayment(order)
  await notifyStaffAll(text, telegramStaffKeyboard(order), maxStaffKeyboard(order))
}

export async function notifyStaffBatchAwaitingPayment(batch: BatchForStaff): Promise<void> {
  if (!isTerminalPaymentMode()) {
    return
  }

  if (!isStaffChannelConfigured()) {
    console.warn(
      '[staff] STAFF_TELEGRAM_CHAT_ID / STAFF_MAX_USER_ID are not set — skipping staff notification',
    )
    return
  }

  const text = formatStaffBatchAwaitingPayment(batch)
  await notifyStaffAll(text, telegramBatchKeyboard(batch.id), maxBatchKeyboard(batch.id))
}

export async function notifyStaffPaymentConfirmed(order: OrderForStaff): Promise<void> {
  if (!isTerminalPaymentMode() || !isStaffChannelConfigured() || order.batchId) {
    return
  }

  const shortId = order.id.slice(-6)
  const text = `✅ Оплата по заказу #${shortId} принята.\n🖨 Печать запущена.`
  await notifyStaffAll(text)
}
