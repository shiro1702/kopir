import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client'
import { prisma } from '../../prisma'
import { getTbankPassword, getTbankWebhookSecret } from '../../tbank-config'
import { isTbankPaymentMethod } from '../methods'
import type { PaymentContext } from '../types'
import {
  tbankGetQr,
  tbankGetState,
  tbankInit,
  tbankCancel,
  verifyTbankNotificationToken,
} from '../tbank-client'

export type TbankPayChannel = 'sbp' | 'card'

export interface TbankInitResult {
  paymentId: string
  merchantOrderId: string
  externalPaymentId: string
  payUrl: string
  channel: TbankPayChannel
  amountKopeks: number
}

export interface TbankLegacyWebhookPayload {
  entityId: string
  status: 'CONFIRMED' | 'REJECTED' | 'CANCELLED'
  paymentId?: string
}

export const tbankAcquiringProvider = {
  method: PaymentMethod.TBANK_ONLINE as const,
  staffNotifyTrigger: 'on_method_selected' as const,
}

function createMerchantOrderId(): string {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 10)
  return `kp_${ts}_${rand}`.slice(0, 36)
}

async function cancelPendingPaymentsForEntity(ctx: PaymentContext) {
  if (ctx.kind === 'batch') {
    await prisma.payment.updateMany({
      where: { batchId: ctx.entityId, status: PaymentStatus.PENDING },
      data: { status: PaymentStatus.CANCELLED },
    })
    return
  }
  await prisma.payment.updateMany({
    where: { orderId: ctx.entityId, status: PaymentStatus.PENDING },
    data: { status: PaymentStatus.CANCELLED },
  })
}

export async function initPayment(
  ctx: PaymentContext,
  channel: TbankPayChannel = 'sbp',
): Promise<TbankInitResult> {
  await cancelPendingPaymentsForEntity(ctx)

  const merchantOrderId = createMerchantOrderId()
  const payment = await prisma.payment.create({
    data: {
      merchantOrderId,
      batchId: ctx.kind === 'batch' ? ctx.entityId : null,
      orderId: ctx.kind === 'order' ? ctx.entityId : null,
      amountKopeks: ctx.amountKopeks,
      status: PaymentStatus.PENDING,
    },
  })

  const initResult = await tbankInit({
    amountKopeks: ctx.amountKopeks,
    merchantOrderId,
    description: `Печать #${ctx.shortId}`,
  })

  const externalPaymentId = initResult.PaymentId
  if (externalPaymentId === undefined || externalPaymentId === null) {
    throw createError({
      statusCode: 502,
      data: { error: 'T-Bank Init did not return PaymentId', code: 'TBANK_INIT_FAILED' },
    })
  }

  let payUrl: string | undefined
  if (channel === 'card') {
    payUrl = initResult.PaymentURL?.trim()
    if (!payUrl) {
      throw createError({
        statusCode: 502,
        data: { error: 'T-Bank Init did not return PaymentURL', code: 'TBANK_INIT_FAILED' },
      })
    }
  } else {
    const qrResult = await tbankGetQr(externalPaymentId, 'PAYLOAD')
    payUrl = qrResult.Data?.trim()
    if (!payUrl) {
      throw createError({
        statusCode: 502,
        data: { error: 'T-Bank GetQr did not return payload', code: 'TBANK_GETQR_FAILED' },
      })
    }
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      externalId: String(externalPaymentId),
      qrPayload: payUrl,
    },
  })

  return {
    paymentId: payment.id,
    merchantOrderId,
    externalPaymentId: String(externalPaymentId),
    payUrl,
    channel,
    amountKopeks: ctx.amountKopeks,
  }
}

export async function getPaymentQrPayload(paymentId: string): Promise<string | null> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } })
  return payment?.qrPayload ?? null
}

function resolveEntityIdFromPayment(payment: {
  batchId: string | null
  orderId: string | null
}): string {
  const entityId = payment.batchId ?? payment.orderId
  if (!entityId) {
    throw createError({
      statusCode: 400,
      data: { error: 'Payment is not linked to an order or batch', code: 'INVALID_PAYMENT' },
    })
  }
  return entityId
}

async function confirmTbankOrderPayment(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true, point: true },
  })
  if (!order) {
    throw createError({
      statusCode: 404,
      data: { error: 'Order not found', code: 'ORDER_NOT_FOUND' },
    })
  }

  if (order.status === OrderStatus.PAID) {
    return {
      id: order.id,
      status: order.status,
      alreadyConfirmed: true,
      paidAt: order.paidAt?.toISOString() ?? null,
    }
  }

  if (order.status !== OrderStatus.AWAITING_PAYMENT || order.batchId) {
    throw createError({
      statusCode: 400,
      data: { error: 'Order is not eligible for online payment', code: 'INVALID_STATUS' },
    })
  }

  if (!isTbankPaymentMethod(order.paymentMethod)) {
    throw createError({
      statusCode: 400,
      data: { error: 'Order payment method is not online acquiring', code: 'INVALID_PAYMENT_METHOD' },
    })
  }

  const now = new Date()
  await prisma.order.update({
    where: { id: orderId },
    data: { paymentConfirmedAt: now },
  })

  const { startOrderPrint } = await import('../../order-staff-actions')
  return startOrderPrint(orderId)
}

export async function confirmTbankPayment(entityId: string) {
  const { resolvePaymentEntity } = await import('../service')
  const resolved = await resolvePaymentEntity(entityId)

  if (resolved.kind === 'batch') {
    const batch = resolved.batch
    if (!isTbankPaymentMethod(batch.paymentMethod)) {
      throw createError({
        statusCode: 400,
        data: { error: 'Batch payment method is not online acquiring', code: 'INVALID_PAYMENT_METHOD' },
      })
    }
    const { confirmBatchPayment } = await import('../../batch')
    return confirmBatchPayment(entityId)
  }

  return confirmTbankOrderPayment(entityId)
}

async function markPaymentConfirmed(
  paymentId: string,
  externalId?: string | number | null,
) {
  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: PaymentStatus.CONFIRMED,
      confirmedAt: new Date(),
      ...(externalId !== undefined && externalId !== null
        ? { externalId: String(externalId) }
        : {}),
    },
  })
}

async function processConfirmedPayment(payment: {
  id: string
  batchId: string | null
  orderId: string | null
  status: PaymentStatus
  externalId: string | null
}, externalPaymentId?: string | number | null) {
  if (payment.status === PaymentStatus.CONFIRMED) {
    const entityId = resolveEntityIdFromPayment(payment)
    return { ok: true, alreadyConfirmed: true, entityId }
  }

  await markPaymentConfirmed(payment.id, externalPaymentId ?? payment.externalId)
  const entityId = resolveEntityIdFromPayment(payment)
  const result = await confirmTbankPayment(entityId)
  return { ok: true, result, entityId }
}

export async function handleTbankNotification(payload: Record<string, unknown>) {
  const password = getTbankPassword()
  if (!password) {
    throw createError({
      statusCode: 500,
      data: { error: 'T-Bank is not configured', code: 'TBANK_NOT_CONFIGURED' },
    })
  }

  if (!verifyTbankNotificationToken(payload, password)) {
    throw createError({
      statusCode: 401,
      data: { error: 'Invalid notification token', code: 'INVALID_TOKEN' },
    })
  }

  const status = String(payload.Status ?? '')
  const success = payload.Success === true || payload.Success === 'true'

  if (status !== 'CONFIRMED' || !success) {
    return { ok: true, ignored: true, status }
  }

  const merchantOrderId = String(payload.OrderId ?? '').trim()
  if (!merchantOrderId) {
    throw createError({
      statusCode: 400,
      data: { error: 'OrderId is required', code: 'INVALID_PAYLOAD' },
    })
  }

  const payment = await prisma.payment.findUnique({ where: { merchantOrderId } })
  if (!payment) {
    throw createError({
      statusCode: 404,
      data: { error: 'Payment not found', code: 'PAYMENT_NOT_FOUND' },
    })
  }

  return processConfirmedPayment(payment, payload.PaymentId as string | number | null)
}

/** Dev/test mock webhook without T-Bank Token signature. */
export async function handleTbankLegacyWebhook(payload: TbankLegacyWebhookPayload) {
  if (!payload.entityId?.trim()) {
    throw createError({
      statusCode: 400,
      data: { error: 'entityId is required', code: 'INVALID_PAYLOAD' },
    })
  }

  if (payload.status !== 'CONFIRMED') {
    return { ok: true, ignored: true, status: payload.status }
  }

  const entityId = payload.entityId.trim()
  const pending = await prisma.payment.findFirst({
    where: {
      status: PaymentStatus.PENDING,
      OR: [{ batchId: entityId }, { orderId: entityId }],
    },
    orderBy: { createdAt: 'desc' },
  })

  if (pending) {
    return processConfirmedPayment(pending, payload.paymentId)
  }

  const result = await confirmTbankPayment(entityId)
  return { ok: true, result }
}

export async function checkTbankPaymentStatus(paymentId: string, userExternalId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      batch: { include: { user: true } },
      order: { include: { user: true } },
    },
  })

  if (!payment) {
    throw createError({
      statusCode: 404,
      data: { error: 'Payment not found', code: 'PAYMENT_NOT_FOUND' },
    })
  }

  const ownerUser = payment.batch?.user ?? payment.order?.user
  if (!ownerUser) {
    throw createError({
      statusCode: 404,
      data: { error: 'Payment owner not found', code: 'NOT_FOUND' },
    })
  }

  const { assertUserOwnsPayment } = await import('../service')
  await assertUserOwnsPayment(userExternalId, ownerUser.id)

  if (payment.status === PaymentStatus.CONFIRMED) {
    return { ok: true, alreadyConfirmed: true }
  }

  if (!payment.externalId) {
    return { ok: true, pending: true }
  }

  const state = await tbankGetState(payment.externalId)
  const confirmed = state.Status === 'CONFIRMED' && state.Success === true
  if (!confirmed) {
    return { ok: true, pending: true, status: state.Status ?? null }
  }

  return processConfirmedPayment(payment, payment.externalId)
}

export function verifyTbankWebhookSecret(header: string | undefined): boolean {
  const secret = getTbankWebhookSecret()
  if (!secret) {
    return true
  }
  return header === secret
}

async function refundConfirmedTbankPayment(payment: {
  id: string
  externalId: string | null
  amountKopeks: number
}) {
  if (!payment.externalId) {
    throw createError({
      statusCode: 400,
      data: { error: 'Payment has no T-Bank PaymentId', code: 'INVALID_PAYMENT' },
    })
  }

  await tbankCancel(payment.externalId, payment.amountKopeks)

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: PaymentStatus.REFUNDED },
  })

  return {
    paymentId: payment.id,
    amountKopeks: payment.amountKopeks,
    refunded: true,
  }
}

export async function refundTbankPaymentForBatch(batchId: string) {
  const batch = await prisma.orderBatch.findUnique({
    where: { id: batchId },
    include: {
      payments: {
        where: { status: PaymentStatus.CONFIRMED },
        orderBy: { confirmedAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!batch) {
    throw createError({
      statusCode: 404,
      data: { error: 'Batch not found', code: 'BATCH_NOT_FOUND' },
    })
  }

  if (!isTbankPaymentMethod(batch.paymentMethod)) {
    throw createError({
      statusCode: 400,
      data: { error: 'Refund is only available for online T-Bank payments', code: 'INVALID_PAYMENT_METHOD' },
    })
  }

  const payment = batch.payments[0]
  if (!payment) {
    throw createError({
      statusCode: 400,
      data: { error: 'No confirmed payment found for this batch', code: 'PAYMENT_NOT_FOUND' },
    })
  }

  const result = await refundConfirmedTbankPayment(payment)

  return {
    id: batch.id,
    kind: 'batch' as const,
    ...result,
  }
}

export async function refundTbankPaymentForOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      payments: {
        where: { status: PaymentStatus.CONFIRMED },
        orderBy: { confirmedAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!order) {
    throw createError({
      statusCode: 404,
      data: { error: 'Order not found', code: 'ORDER_NOT_FOUND' },
    })
  }

  if (order.batchId) {
    return refundTbankPaymentForBatch(order.batchId)
  }

  if (!isTbankPaymentMethod(order.paymentMethod)) {
    throw createError({
      statusCode: 400,
      data: { error: 'Refund is only available for online T-Bank payments', code: 'INVALID_PAYMENT_METHOD' },
    })
  }

  const payment = order.payments[0]
  if (!payment) {
    throw createError({
      statusCode: 400,
      data: { error: 'No confirmed payment found for this order', code: 'PAYMENT_NOT_FOUND' },
    })
  }

  const result = await refundConfirmedTbankPayment(payment)

  return {
    id: order.id,
    kind: 'order' as const,
    ...result,
  }
}

export function isLegacyTbankWebhookPayload(body: unknown): body is TbankLegacyWebhookPayload {
  if (!body || typeof body !== 'object') {
    return false
  }
  const record = body as Record<string, unknown>
  return typeof record.entityId === 'string'
    && typeof record.status === 'string'
    && !record.Token
}
