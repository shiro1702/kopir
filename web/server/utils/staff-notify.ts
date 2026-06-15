import type { Order } from '@prisma/client'
import { InlineKeyboard } from 'grammy'
import { formatStaffOrderAwaitingPayment } from './bot/messages'
import {
  getStaffMaxUserId,
  getStaffTelegramChatId,
  isStaffChannelConfigured,
  isTerminalPaymentMode,
} from './payment-mode'
import type { MaxInlineKeyboardAttachment } from './max/types'
import { getMaxClient } from './max/client'
import { getBot } from './telegram/bot'

type OrderForStaff = Pick<Order, 'id' | 'fileName' | 'pageCount' | 'amountKopeks' | 'paymentConfirmedAt'>
  & {
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
  }
  keyboard.text('🖨 Печать', `staff_print:${order.id}`)
  return keyboard
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
  }
  buttons.push([{
    type: 'callback',
    text: '🖨 Печать',
    payload: `staff_print:${order.id}`,
    intent: 'default',
  }])
  return {
    type: 'inline_keyboard',
    payload: { buttons },
  }
}

async function notifyStaffTelegram(order: OrderForStaff, text: string): Promise<void> {
  const chatId = getStaffTelegramChatId()
  if (!chatId) {
    return
  }

  const bot = getBot()
  await bot.api.sendMessage(chatId, text, {
    reply_markup: telegramStaffKeyboard(order),
  })
}

async function notifyStaffMax(order: OrderForStaff, text: string): Promise<void> {
  const userId = getStaffMaxUserId()
  if (!userId) {
    return
  }

  const client = getMaxClient()
  await client.sendMessage({ userId }, text, [maxStaffKeyboard(order)])
}

async function notifyStaffAll(order: OrderForStaff, text: string): Promise<void> {
  const errors: Error[] = []

  try {
    await notifyStaffTelegram(order, text)
  } catch (error) {
    errors.push(error instanceof Error ? error : new Error(String(error)))
  }

  try {
    await notifyStaffMax(order, text)
  } catch (error) {
    errors.push(error instanceof Error ? error : new Error(String(error)))
  }

  if (errors.length > 0) {
    console.error('[staff] notify failed:', errors)
    throw errors[0]
  }
}

export async function notifyStaffOrderAwaitingPayment(order: OrderForStaff): Promise<void> {
  if (!isTerminalPaymentMode()) {
    return
  }

  if (!isStaffChannelConfigured()) {
    console.warn(
      '[staff] STAFF_TELEGRAM_CHAT_ID / STAFF_MAX_USER_ID are not set — skipping staff notification',
    )
    return
  }

  const text = formatStaffOrderAwaitingPayment(order)
  await notifyStaffAll(order, text)
}

export async function notifyStaffPaymentConfirmed(order: OrderForStaff): Promise<void> {
  if (!isTerminalPaymentMode() || !isStaffChannelConfigured()) {
    return
  }

  const shortId = order.id.slice(-6)
  const text = `✅ Оплата по заказу #${shortId} отмечена.\nМожно нажать «Печать».`
  await notifyStaffAll(order, text)
}
