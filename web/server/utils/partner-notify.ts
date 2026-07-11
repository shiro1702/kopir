import type { Order } from '@prisma/client'
import { InputFile, InlineKeyboard } from 'grammy'
import { formatPartnerPrintFailed } from './bot/partner-messages'
import { formatPartnerRefundRequest } from './bot/messages'
import { partnerRefundPayload } from './bot/keyboards'
import { downloadOrderFile } from './blob'
import { getMaxClient } from './max/client'
import {
  getPartnerMessengerTargetsForPoint,
  hasPartnerNotifyTargets,
} from './partner-auth'
import { canPartnerRefundOrder } from './refund-eligibility'

type OrderForPartner = Pick<Order, 'id' | 'fileName' | 'filePath' | 'batchId' | 'pointId' | 'errorMessage' | 'amountKopeks'>
  & {
    point: { name: string }
  }

type OrderForPartnerRefundRequest = OrderForPartner & {
  user: { username?: string | null, firstName?: string | null }
}

function maxPartnerPrintFailedKeyboard(orderId: string) {
  return {
    type: 'inline_keyboard' as const,
    payload: {
      buttons: [[{
        type: 'callback' as const,
        text: '💸 Вернуть оплату',
        payload: partnerRefundPayload(orderId),
        intent: 'default' as const,
      }]],
    },
  }
}

function telegramPartnerPrintFailedKeyboard(orderId: string) {
  return new InlineKeyboard().text('💸 Вернуть оплату', partnerRefundPayload(orderId))
}

export async function notifyPartnerPrintFailed(
  order: OrderForPartner,
): Promise<void> {
  if (!(await hasPartnerNotifyTargets(order.pointId))) {
    return
  }

  const text = formatPartnerPrintFailed(order, order.errorMessage)
  const targets = await getPartnerMessengerTargetsForPoint(order.pointId)
  const showRefundButton = await canPartnerRefundOrder(order.id)
  const tgKeyboard = showRefundButton ? telegramPartnerPrintFailedKeyboard(order.id) : undefined
  const maxKeyboard = showRefundButton ? maxPartnerPrintFailedKeyboard(order.id) : undefined

  let fileBuffer: Buffer | null = null
  if (order.filePath?.trim()) {
    try {
      fileBuffer = await downloadOrderFile(order.filePath)
    } catch (error) {
      console.error('[partner] failed to load order file for manual print:', order.id, error)
    }
  }

  const errors: Error[] = []

  if (targets.telegramUserId !== null) {
    try {
      const { getBot } = await import('./telegram/bot')
      const bot = getBot()
      if (fileBuffer) {
        await bot.api.sendDocument(
          targets.telegramUserId,
          new InputFile(fileBuffer, order.fileName),
          { caption: text, reply_markup: tgKeyboard },
        )
      } else {
        await bot.api.sendMessage(targets.telegramUserId, text, { reply_markup: tgKeyboard })
      }
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)))
    }
  }

  if (targets.maxUserId !== null) {
    try {
      const client = getMaxClient()
      if (fileBuffer) {
        await client.sendFileMessage(
          { userId: targets.maxUserId },
          text,
          order.fileName,
          fileBuffer,
          maxKeyboard ? [maxKeyboard] : undefined,
        )
      } else {
        await client.sendMessage(
          { userId: targets.maxUserId },
          text,
          maxKeyboard ? [maxKeyboard] : undefined,
        )
      }
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)))
    }
  }

  if (errors.length > 0) {
    console.error('[partner] print failure notify failed:', errors)
    throw errors[0]
  }
}

export async function notifyPartnerRefundRequest(
  order: OrderForPartnerRefundRequest,
): Promise<void> {
  if (!(await hasPartnerNotifyTargets(order.pointId))) {
    return
  }

  const eligibility = await import('./refund-eligibility').then((m) => m.getOrderRefundEligibility(order.id))
  const amountKopeks = eligibility?.amountKopeks ?? order.amountKopeks
  const text = formatPartnerRefundRequest({
    ...order,
    amountKopeks,
  })
  const targets = await getPartnerMessengerTargetsForPoint(order.pointId)
  const showRefundButton = eligibility?.canRefundOnline === true
  const tgKeyboard = showRefundButton ? telegramPartnerPrintFailedKeyboard(order.id) : undefined
  const maxKeyboard = showRefundButton ? maxPartnerPrintFailedKeyboard(order.id) : undefined

  const errors: Error[] = []

  if (targets.telegramUserId !== null) {
    try {
      const { getBot } = await import('./telegram/bot')
      const bot = getBot()
      await bot.api.sendMessage(targets.telegramUserId, text, { reply_markup: tgKeyboard })
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)))
    }
  }

  if (targets.maxUserId !== null) {
    try {
      const client = getMaxClient()
      await client.sendMessage(
        { userId: targets.maxUserId },
        text,
        maxKeyboard ? [maxKeyboard] : undefined,
      )
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)))
    }
  }

  if (errors.length > 0) {
    console.error('[partner] refund request notify failed:', errors)
    throw errors[0]
  }
}
