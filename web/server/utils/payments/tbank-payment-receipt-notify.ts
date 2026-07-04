import type { User } from '@prisma/client'
import { isTbankReceiptEnabled } from '../tbank-config'
import { prisma } from '../prisma'
import { scheduleWebhookBackgroundTask } from './tbank-log'
import { extractReceiptUrl, resolveTbankReceiptUrl } from './tbank-receipt-link'

type WaitUntilEvent = {
  waitUntil?: (promise: Promise<unknown>) => void
  context?: { waitUntil?: (promise: Promise<unknown>) => void }
}

async function notifyUserReceiptLink(
  user: Pick<User, 'telegramId' | 'maxUserId'>,
  shortId: string,
  receiptUrl: string,
): Promise<void> {
  const { sendTbankReceiptLinkToUser } = await import('../bot/core')
  await sendTbankReceiptLinkToUser(user, shortId, receiptUrl)
}

export async function sendTbankReceiptToCustomer(
  paymentId: string,
  webhookPayload?: Record<string, unknown>,
): Promise<void> {
  if (!isTbankReceiptEnabled()) {
    return
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      batch: { include: { user: true } },
      order: { include: { user: true } },
    },
  })

  if (!payment?.externalId) {
    return
  }

  const user = payment.batch?.user ?? payment.order?.user
  if (!user) {
    return
  }

  const shortId = (payment.batchId ?? payment.orderId ?? paymentId).slice(-6)
  const hintUrl = webhookPayload ? extractReceiptUrl(webhookPayload) : null

  const receiptUrl = await resolveTbankReceiptUrl(payment.externalId, hintUrl)
  if (!receiptUrl) {
    console.warn('[tbank] receipt url unavailable for customer notify:', paymentId)
    return
  }

  await notifyUserReceiptLink(user, shortId, receiptUrl)
}

export function scheduleTbankReceiptNotify(
  paymentId: string,
  webhookPayload?: Record<string, unknown>,
  event?: WaitUntilEvent,
): void {
  if (!isTbankReceiptEnabled()) {
    return
  }

  const task = sendTbankReceiptToCustomer(paymentId, webhookPayload)
  if (event) {
    scheduleWebhookBackgroundTask(event, task)
    return
  }
  void task
}
