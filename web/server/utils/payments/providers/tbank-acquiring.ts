import { OrderStatus, PaymentMethod } from '@prisma/client'
import { prisma } from '../../prisma'
import { getTbankWebhookSecret } from '../../tbank-config'
import type { PaymentContext } from '../types'

export interface TbankInitResult {
  paymentId: string
  qrPayload: string
  amountKopeks: number
}

export interface TbankWebhookPayload {
  entityId: string
  status: 'CONFIRMED' | 'REJECTED' | 'CANCELLED'
  paymentId?: string
}

const pendingPayments = new Map<string, { entityId: string, amountKopeks: number }>()

export const tbankAcquiringProvider = {
  method: PaymentMethod.TBANK_ONLINE as const,
  staffNotifyTrigger: 'on_method_selected' as const,
}

export function initPayment(ctx: PaymentContext): TbankInitResult {
  const paymentId = `tbank_stub_${ctx.entityId.slice(-8)}_${Date.now()}`
  pendingPayments.set(paymentId, {
    entityId: ctx.entityId,
    amountKopeks: ctx.amountKopeks,
  })
  return {
    paymentId,
    qrPayload: `STUB-QR:${paymentId}:${ctx.amountKopeks}`,
    amountKopeks: ctx.amountKopeks,
  }
}

export function getQr(paymentId: string): string | null {
  const record = pendingPayments.get(paymentId)
  if (!record) {
    return null
  }
  return `STUB-QR:${paymentId}:${record.amountKopeks}`
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

  if (order.paymentMethod !== PaymentMethod.TBANK_ONLINE) {
    throw createError({
      statusCode: 400,
      data: { error: 'Order payment method is not TBANK_ONLINE', code: 'INVALID_PAYMENT_METHOD' },
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
    if (batch.paymentMethod !== PaymentMethod.TBANK_ONLINE) {
      throw createError({
        statusCode: 400,
        data: { error: 'Batch payment method is not TBANK_ONLINE', code: 'INVALID_PAYMENT_METHOD' },
      })
    }
    const { confirmBatchPayment } = await import('../../batch')
    return confirmBatchPayment(entityId)
  }

  return confirmTbankOrderPayment(entityId)
}

export async function handleTbankWebhook(payload: TbankWebhookPayload) {
  if (!payload.entityId?.trim()) {
    throw createError({
      statusCode: 400,
      data: { error: 'entityId is required', code: 'INVALID_PAYLOAD' },
    })
  }

  if (payload.status !== 'CONFIRMED') {
    return { ok: true, ignored: true, status: payload.status }
  }

  const result = await confirmTbankPayment(payload.entityId.trim())
  if (payload.paymentId) {
    pendingPayments.delete(payload.paymentId)
  }
  return { ok: true, result }
}

export function verifyTbankWebhookSecret(header: string | undefined): boolean {
  const secret = getTbankWebhookSecret()
  if (!secret) {
    return true
  }
  return header === secret
}

export function _resetPendingPaymentsForTest() {
  pendingPayments.clear()
}
