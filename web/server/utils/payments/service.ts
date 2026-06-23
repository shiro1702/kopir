import {
  OrderBatchStatus,
  OrderStatus,
  PaymentMethod,
} from '@prisma/client'
import { isActiveBatchOrder } from '../batch'
import {
  getEnabledPaymentMethods,
  getTransferBankLabel,
  getTransferPhone,
} from '../payment-config'
import { isTerminalPaymentMode } from '../payment-mode'
import { prisma } from '../prisma'
import { manualOnSiteProvider } from './providers/manual-on-site'
import { manualTransferProvider } from './providers/manual-transfer'
import type { PaymentEntityKind } from './types'

function paymentError(message: string, code: string, statusCode = 400) {
  return createError({
    statusCode,
    data: { error: message, code },
  })
}

export async function resolvePaymentEntity(entityId: string) {
  const batch = await prisma.orderBatch.findUnique({
    where: { id: entityId },
    include: {
      orders: { orderBy: { batchIndex: 'asc' } },
      user: true,
      point: true,
    },
  })
  if (batch?.status === OrderBatchStatus.AWAITING_PAYMENT) {
    return {
      kind: 'batch' as PaymentEntityKind,
      batch: {
        ...batch,
        orders: batch.orders.filter(isActiveBatchOrder),
      },
    }
  }

  const order = await prisma.order.findUnique({
    where: { id: entityId },
    include: { user: true, point: true, batch: true },
  })
  if (!order) {
    throw paymentError('Payment entity not found', 'NOT_FOUND', 404)
  }
  if (order.batchId && order.batch?.status === OrderBatchStatus.AWAITING_PAYMENT) {
    const parentBatch = await prisma.orderBatch.findUnique({
      where: { id: order.batchId },
      include: {
        orders: { orderBy: { batchIndex: 'asc' } },
        user: true,
        point: true,
      },
    })
    if (parentBatch) {
      return {
        kind: 'batch' as PaymentEntityKind,
        batch: {
          ...parentBatch,
          orders: parentBatch.orders.filter(isActiveBatchOrder),
        },
      }
    }
  }
  if (order.status !== OrderStatus.AWAITING_PAYMENT || order.batchId) {
    throw paymentError('Order is not awaiting payment', 'INVALID_STATUS')
  }
  return { kind: 'order' as PaymentEntityKind, order }
}

async function assertUserOwnsEntity(
  userExternalId: string,
  kind: PaymentEntityKind,
  userId: string,
) {
  const dbUser = await prisma.user.findFirst({
    where: {
      OR: [
        { telegramId: BigInt(userExternalId) },
        { maxUserId: BigInt(userExternalId) },
      ],
    },
  })
  if (!dbUser || dbUser.id !== userId) {
    throw paymentError('Forbidden', 'FORBIDDEN', 403)
  }
}

export function assertReadyForStaffPaymentConfirm(
  paymentMethod: PaymentMethod | null,
  paymentClaimedAt: Date | null,
) {
  if (!paymentMethod) {
    throw paymentError('Client has not selected a payment method', 'PAYMENT_METHOD_REQUIRED')
  }
  if (paymentMethod === PaymentMethod.SBP_TRANSFER && !paymentClaimedAt) {
    throw paymentError('Waiting for client to confirm transfer', 'PAYMENT_NOT_CLAIMED')
  }
}

export async function selectPaymentMethod(
  entityId: string,
  method: PaymentMethod,
  userExternalId: string,
) {
  if (!isTerminalPaymentMode()) {
    throw paymentError('Manual payment methods are only available in terminal mode', 'INVALID_PAYMENT_MODE')
  }

  const resolved = await resolvePaymentEntity(entityId)
  const now = new Date()

  if (resolved.kind === 'batch') {
    const batch = resolved.batch
    await assertUserOwnsEntity(userExternalId, 'batch', batch.userId)

    const enabled = getEnabledPaymentMethods(batch.point)
    if (!enabled.includes(method)) {
      throw paymentError('Payment method is not available', 'PAYMENT_METHOD_UNAVAILABLE')
    }

    await prisma.$transaction([
      prisma.orderBatch.update({
        where: { id: batch.id },
        data: {
          paymentMethod: method,
          paymentMethodAt: now,
          paymentClaimedAt: null,
        },
      }),
      prisma.order.updateMany({
        where: { batchId: batch.id },
        data: {
          paymentMethod: method,
          paymentMethodAt: now,
          paymentClaimedAt: null,
        },
      }),
    ])

    const fresh = await prisma.orderBatch.findUnique({
      where: { id: batch.id },
      include: {
        orders: { orderBy: { batchIndex: 'asc' } },
        user: true,
        point: true,
      },
    })
    if (!fresh) {
      throw paymentError('Batch not found', 'BATCH_NOT_FOUND', 404)
    }

    const result = {
      kind: 'batch' as const,
      batch: { ...fresh, orders: fresh.orders.filter(isActiveBatchOrder) },
      method,
    }

    if (method === PaymentMethod.ON_SITE && manualOnSiteProvider.staffNotifyTrigger === 'on_method_selected') {
      const { notifyStaffBatchPaymentPending } = await import('../staff-notify')
      await notifyStaffBatchPaymentPending(result.batch)
    }

    return result
  }

  const order = resolved.order
  await assertUserOwnsEntity(userExternalId, 'order', order.userId)

  const enabled = getEnabledPaymentMethods(order.point)
  if (!enabled.includes(method)) {
    throw paymentError('Payment method is not available', 'PAYMENT_METHOD_UNAVAILABLE')
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentMethod: method,
      paymentMethodAt: now,
      paymentClaimedAt: null,
    },
    include: { user: true, point: true },
  })

  const result = { kind: 'order' as const, order: updated, method }

  if (method === PaymentMethod.ON_SITE) {
    const { notifyStaffOrderPaymentPending } = await import('../staff-notify')
    await notifyStaffOrderPaymentPending(updated)
  }

  return result
}

export async function claimPayment(entityId: string, userExternalId: string) {
  const resolved = await resolvePaymentEntity(entityId)
  const now = new Date()

  if (resolved.kind === 'batch') {
    const batch = resolved.batch
    await assertUserOwnsEntity(userExternalId, 'batch', batch.userId)

    if (batch.paymentMethod !== PaymentMethod.SBP_TRANSFER) {
      throw paymentError('Claim is only for bank transfer', 'INVALID_PAYMENT_METHOD')
    }
    if (batch.paymentClaimedAt) {
      return { kind: 'batch' as const, batch }
    }

    await prisma.$transaction([
      prisma.orderBatch.update({
        where: { id: batch.id },
        data: { paymentClaimedAt: now },
      }),
      prisma.order.updateMany({
        where: { batchId: batch.id },
        data: { paymentClaimedAt: now },
      }),
    ])

    const fresh = await prisma.orderBatch.findUnique({
      where: { id: batch.id },
      include: {
        orders: { orderBy: { batchIndex: 'asc' } },
        user: true,
        point: true,
      },
    })
    if (!fresh) {
      throw paymentError('Batch not found', 'BATCH_NOT_FOUND', 404)
    }
    const batchWithOrders = { ...fresh, orders: fresh.orders.filter(isActiveBatchOrder) }

    if (manualTransferProvider.staffNotifyTrigger === 'on_client_claimed') {
      const { notifyStaffBatchPaymentPending } = await import('../staff-notify')
      await notifyStaffBatchPaymentPending(batchWithOrders)
    }

    return { kind: 'batch' as const, batch: batchWithOrders }
  }

  const order = resolved.order
  await assertUserOwnsEntity(userExternalId, 'order', order.userId)

  if (order.paymentMethod !== PaymentMethod.SBP_TRANSFER) {
    throw paymentError('Claim is only for bank transfer', 'INVALID_PAYMENT_METHOD')
  }
  if (order.paymentClaimedAt) {
    return { kind: 'order' as const, order }
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { paymentClaimedAt: now },
    include: { user: true, point: true },
  })

  const { notifyStaffOrderPaymentPending } = await import('../staff-notify')
  await notifyStaffOrderPaymentPending(updated)

  return { kind: 'order' as const, order: updated }
}

export async function resetPaymentMethod(entityId: string, userExternalId: string) {
  const resolved = await resolvePaymentEntity(entityId)

  if (resolved.kind === 'batch') {
    const batch = resolved.batch
    await assertUserOwnsEntity(userExternalId, 'batch', batch.userId)
    if (batch.status !== OrderBatchStatus.AWAITING_PAYMENT) {
      throw paymentError('Payment already confirmed', 'PAYMENT_ALREADY_CONFIRMED')
    }

    await prisma.$transaction([
      prisma.orderBatch.update({
        where: { id: batch.id },
        data: {
          paymentMethod: null,
          paymentMethodAt: null,
          paymentClaimedAt: null,
        },
      }),
      prisma.order.updateMany({
        where: { batchId: batch.id },
        data: {
          paymentMethod: null,
          paymentMethodAt: null,
          paymentClaimedAt: null,
        },
      }),
    ])

    const fresh = await prisma.orderBatch.findUnique({
      where: { id: batch.id },
      include: { orders: { orderBy: { batchIndex: 'asc' } }, user: true, point: true },
    })
    if (!fresh) {
      throw paymentError('Batch not found', 'BATCH_NOT_FOUND', 404)
    }
    return { kind: 'batch' as const, batch: { ...fresh, orders: fresh.orders.filter(isActiveBatchOrder) } }
  }

  const order = resolved.order
  await assertUserOwnsEntity(userExternalId, 'order', order.userId)
  if (order.paymentConfirmedAt) {
    throw paymentError('Payment already confirmed', 'PAYMENT_ALREADY_CONFIRMED')
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentMethod: null,
      paymentMethodAt: null,
      paymentClaimedAt: null,
    },
    include: { user: true, point: true },
  })
  return { kind: 'order' as const, order: updated }
}

export function getTransferDetailsForPoint(point: { transferPhone: string | null, transferBankLabel: string | null }) {
  return {
    phone: getTransferPhone(point),
    bankLabel: getTransferBankLabel(point),
  }
}

export { getEnabledPaymentMethods }
