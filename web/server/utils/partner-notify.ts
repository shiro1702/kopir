import type { Order } from '@prisma/client'
import { InputFile } from 'grammy'
import { formatPartnerPrintFailed } from './bot/partner-messages'
import { downloadOrderFile } from './blob'
import { getMaxClient } from './max/client'
import {
  getPartnerMessengerTargetsForPoint,
  hasPartnerNotifyTargets,
} from './partner-auth'

type OrderForPartner = Pick<Order, 'id' | 'fileName' | 'filePath' | 'batchId' | 'pointId' | 'errorMessage'>
  & {
    point: { name: string }
  }

export async function notifyPartnerPrintFailed(
  order: OrderForPartner,
): Promise<void> {
  if (!(await hasPartnerNotifyTargets(order.pointId))) {
    return
  }

  const text = formatPartnerPrintFailed(order, order.errorMessage)
  const targets = await getPartnerMessengerTargetsForPoint(order.pointId)

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
          { caption: text },
        )
      } else {
        await bot.api.sendMessage(targets.telegramUserId, text)
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
        )
      } else {
        await client.sendMessage({ userId: targets.maxUserId }, text)
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
