import { OrderBatchStatus, OrderStatus, type Order, type OrderBatch } from '@prisma/client'
import { deleteOrderFile } from './blob'
import { getPricePerPageKopeks } from './calculation'
import { prisma } from './prisma'
import { assertReadyForStaffPaymentConfirm } from './payments/service'
import { isPointAgentOnline } from './points'
import type { BatchKeyboardMode } from './bot/types'
import {
  MSG_BATCH_CALCULATION_FAILED,
  MSG_BATCH_CANNOT_REMOVE_CALCULATING,
  MSG_BATCH_STILL_CALCULATING,
} from './bot/messages'

export const REMOVED_BY_USER = 'removed by user'

export function isActiveBatchOrder(order: Pick<Order, 'status' | 'errorMessage'>): boolean {
  return !(order.status === OrderStatus.FAILED && order.errorMessage === REMOVED_BY_USER)
}

export async function getActiveBatchOrders(batchId: string): Promise<Order[]> {
  const orders = await prisma.order.findMany({
    where: { batchId },
    orderBy: { batchIndex: 'asc' },
  })
  return orders.filter(isActiveBatchOrder)
}

export async function countActiveBatchOrders(batchId: string): Promise<number> {
  const orders = await getActiveBatchOrders(batchId)
  return orders.length
}

export async function reindexBatchOrders(batchId: string): Promise<void> {
  const active = await getActiveBatchOrders(batchId)
  for (let i = 0; i < active.length; i++) {
    const nextIndex = i + 1
    if (active[i]!.batchIndex !== nextIndex) {
      await prisma.order.update({
        where: { id: active[i]!.id },
        data: { batchIndex: nextIndex },
      })
    }
  }
}

export interface RemoveOrderFromBatchResult {
  batchId: string
  removedFileName: string
  remainingCount: number
  batchCancelled: boolean
}

export async function removeOrderFromBatch(
  orderId: string,
  userId: string,
): Promise<RemoveOrderFromBatchResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { batch: true },
  })

  if (!order?.batchId || !order.batch) {
    throw createError({
      statusCode: 404,
      data: { error: 'Order not found in batch', code: 'ORDER_NOT_FOUND' },
    })
  }

  if (order.userId !== userId) {
    throw createError({
      statusCode: 403,
      data: { error: 'Forbidden', code: 'FORBIDDEN' },
    })
  }

  if (order.batch.status !== OrderBatchStatus.COLLECTING) {
    throw createError({
      statusCode: 400,
      data: { error: 'Пачка уже завершена', code: 'INVALID_BATCH_STATUS' },
    })
  }

  if (!isActiveBatchOrder(order)) {
    return {
      batchId: order.batchId,
      removedFileName: order.fileName,
      remainingCount: await countActiveBatchOrders(order.batchId),
      batchCancelled: false,
    }
  }

  if (order.status === OrderStatus.CALCULATING) {
    throw createError({
      statusCode: 409,
      data: {
        error: MSG_BATCH_CANNOT_REMOVE_CALCULATING,
        code: 'BATCH_FILE_CALCULATING',
      },
    })
  }

  if (order.filePath) {
    await deleteOrderFile(order.filePath)
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: OrderStatus.FAILED,
      errorMessage: REMOVED_BY_USER,
    },
  })

  await reindexBatchOrders(order.batchId)
  await recalculateBatchTotals(order.batchId)

  const remainingCount = await countActiveBatchOrders(order.batchId)
  let batchCancelled = false

  if (remainingCount === 0) {
    await cancelBatch(order.batchId, {
      internalReason: REMOVED_BY_USER,
      notifyUser: false,
    })
    batchCancelled = true
  }

  return {
    batchId: order.batchId,
    removedFileName: order.fileName,
    remainingCount,
    batchCancelled,
  }
}

export function getBatchMaxFiles(): number {
  const config = useRuntimeConfig()
  const value = Number(config.batchMaxFiles)
  return Number.isFinite(value) && value > 0 ? value : 5
}

export function getBatchBuildTimeoutMin(): number {
  const config = useRuntimeConfig()
  const value = Number(config.batchBuildTimeoutMin)
  return Number.isFinite(value) && value > 0 ? value : 15
}

function batchLog(batchId: string, message: string, extra?: unknown) {
  if (extra !== undefined) {
    console.log(`[batch:${batchId}] ${message}`, extra)
  } else {
    console.log(`[batch:${batchId}] ${message}`)
  }
}

export async function getBatchKeyboardMode(batchId: string): Promise<BatchKeyboardMode> {
  const active = await getActiveBatchOrders(batchId)
  const calculating = active.filter((o) => o.status === OrderStatus.CALCULATING)
  return calculating.length > 0 ? 'calculating' : 'ready'
}

export async function recalculateBatchTotals(batchId: string): Promise<OrderBatch> {
  const orders = await getActiveBatchOrders(batchId)

  const totalPages = orders.reduce((sum, order) => sum + order.pageCount, 0)
  const totalAmountKopeks = orders.reduce((sum, order) => sum + order.amountKopeks, 0)

  return prisma.orderBatch.update({
    where: { id: batchId },
    data: { totalPages, totalAmountKopeks },
  })
}

export async function getActiveCollectingBatch(
  userId: string,
  pointId: string,
): Promise<(OrderBatch & { orders: Order[] }) | null> {
  return prisma.orderBatch.findFirst({
    where: {
      userId,
      pointId,
      status: OrderBatchStatus.COLLECTING,
    },
    include: {
      orders: { orderBy: { batchIndex: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getOrCreateCollectingBatch(
  userId: string,
  pointId: string,
): Promise<OrderBatch & { orders: Order[] }> {
  const existing = await getActiveCollectingBatch(userId, pointId)
  if (existing) {
    return existing
  }

  const batch = await prisma.orderBatch.create({
    data: {
      userId,
      pointId,
      status: OrderBatchStatus.COLLECTING,
    },
    include: { orders: true },
  })
  batchLog(batch.id, 'created collecting batch')
  return batch
}

export async function getNextBatchIndex(batchId: string): Promise<number> {
  const active = await getActiveBatchOrders(batchId)
  if (active.length === 0) {
    return 1
  }
  return Math.max(...active.map((o) => o.batchIndex ?? 0)) + 1
}

export async function expireStaleCollectingBatches(): Promise<void> {
  const timeoutMin = getBatchBuildTimeoutMin()
  const cutoff = new Date(Date.now() - timeoutMin * 60 * 1000)

  const staleBatches = await prisma.orderBatch.findMany({
    where: {
      status: OrderBatchStatus.COLLECTING,
      updatedAt: { lt: cutoff },
    },
    include: { orders: true, user: true },
  })

  for (const batch of staleBatches) {
    batchLog(batch.id, 'auto-cancel due to timeout')
    await cancelBatch(batch.id, 'Пачка отменена: время сбора истекло')
  }
}

export interface CancelBatchOptions {
  /** Stored on failed orders */
  internalReason?: string
  /** Extra line for async notification (timeout); omitted for plain cancel text */
  userMessage?: string
  /** When false, caller sends the in-chat message */
  notifyUser?: boolean
}

export async function cancelBatch(
  batchId: string,
  options: CancelBatchOptions | string = {},
): Promise<void> {
  const opts: CancelBatchOptions = typeof options === 'string'
    ? { userMessage: options, notifyUser: true }
    : options

  const internalReason = opts.internalReason ?? opts.userMessage ?? 'batch cancelled'
  const notifyUser = opts.notifyUser ?? true

  const batch = await prisma.orderBatch.findUnique({
    where: { id: batchId },
    include: { orders: true, user: true },
  })
  if (!batch || batch.status === OrderBatchStatus.CANCELLED) {
    return
  }

  if (batch.status !== OrderBatchStatus.COLLECTING) {
    throw createError({
      statusCode: 400,
      data: { error: 'Only collecting batches can be cancelled', code: 'INVALID_BATCH_STATUS' },
    })
  }

  for (const order of batch.orders) {
    if (order.filePath) {
      await deleteOrderFile(order.filePath)
    }
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.FAILED,
        errorMessage: internalReason,
      },
    })
  }

  await prisma.orderBatch.update({
    where: { id: batchId },
    data: { status: OrderBatchStatus.CANCELLED },
  })

  if (notifyUser) {
    try {
      const { notifyBatchCancelled } = await import('./bot/core')
      await notifyBatchCancelled(batch.user, opts.userMessage)
    } catch (error) {
      console.error('[batch] cancel notify failed:', batchId, error)
    }
  }
}

export interface FinalizeBatchResult {
  batch: OrderBatch & { orders: Order[] }
}

export async function finalizeBatch(batchId: string): Promise<FinalizeBatchResult> {
  const batch = await prisma.orderBatch.findUnique({
    where: { id: batchId },
    include: {
      orders: { orderBy: { batchIndex: 'asc' } },
      user: true,
      point: true,
    },
  })

  if (!batch) {
    throw createError({
      statusCode: 404,
      data: { error: 'Batch not found', code: 'BATCH_NOT_FOUND' },
    })
  }

  if (batch.status !== OrderBatchStatus.COLLECTING) {
    throw createError({
      statusCode: 400,
      data: { error: 'Batch is not collecting', code: 'INVALID_BATCH_STATUS' },
    })
  }

  const activeOrders = batch.orders.filter(isActiveBatchOrder)

  if (activeOrders.length === 0) {
    throw createError({
      statusCode: 400,
      data: { error: 'Batch has no files', code: 'EMPTY_BATCH' },
    })
  }

  const calculating = activeOrders.filter((o) => o.status === OrderStatus.CALCULATING)
  if (calculating.length > 0) {
    throw createError({
      statusCode: 400,
      data: {
        error: MSG_BATCH_STILL_CALCULATING,
        code: 'BATCH_CALCULATING',
      },
    })
  }

  const failed = activeOrders.filter((o) => o.status === OrderStatus.CALCULATION_FAILED)
  if (failed.length > 0) {
    throw createError({
      statusCode: 400,
      data: {
        error: `${MSG_BATCH_CALCULATION_FAILED}\n\nФайлы: ${failed.map((o) => o.fileName).join(', ')}`,
        code: 'BATCH_CALCULATION_FAILED',
      },
    })
  }

  const pricePerPage = getPricePerPageKopeks(batch.point)
  for (const order of activeOrders) {
    if (order.amountKopeks === 0 && order.pageCount > 0) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          amountKopeks: order.pageCount * pricePerPage,
          status: OrderStatus.AWAITING_PAYMENT,
        },
      })
    } else if (order.status !== OrderStatus.AWAITING_PAYMENT) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.AWAITING_PAYMENT },
      })
    }
  }

  const updatedBatch = await recalculateBatchTotals(batchId)
  const finalBatch = await prisma.orderBatch.update({
    where: { id: batchId },
    data: { status: OrderBatchStatus.AWAITING_PAYMENT },
    include: {
      orders: { orderBy: { batchIndex: 'asc' } },
      user: true,
      point: true,
    },
  })

  batchLog(batchId, 'finalized', {
    files: activeOrders.length,
    totalPages: updatedBatch.totalPages,
    totalAmountKopeks: updatedBatch.totalAmountKopeks,
  })

  const finalBatchWithActive = {
    ...finalBatch,
    orders: finalBatch.orders.filter(isActiveBatchOrder),
  }

  return { batch: finalBatchWithActive }
}

export async function confirmBatchPayment(batchId: string) {
  const batch = await prisma.orderBatch.findUnique({
    where: { id: batchId },
    include: {
      orders: { orderBy: { batchIndex: 'asc' } },
      user: true,
      point: true,
    },
  })

  if (!batch) {
    throw createError({
      statusCode: 404,
      data: { error: 'Batch not found', code: 'BATCH_NOT_FOUND' },
    })
  }

  if (batch.status === OrderBatchStatus.PAID) {
    return {
      id: batch.id,
      status: batch.status,
      alreadyConfirmed: true,
      paidAt: batch.paidAt?.toISOString() ?? null,
    }
  }

  if (batch.status !== OrderBatchStatus.AWAITING_PAYMENT) {
    throw createError({
      statusCode: 400,
      data: { error: 'Batch is not awaiting payment', code: 'INVALID_BATCH_STATUS' },
    })
  }

  assertReadyForStaffPaymentConfirm(batch.paymentMethod, batch.paymentClaimedAt)

  const now = new Date()
  await prisma.$transaction([
    prisma.orderBatch.update({
      where: { id: batchId },
      data: { status: OrderBatchStatus.PAID, paidAt: now },
    }),
    prisma.order.updateMany({
      where: { batchId },
      data: {
        status: OrderStatus.PAID,
        paidAt: now,
        paymentConfirmedAt: now,
      },
    }),
  ])

  batchLog(batchId, 'payment confirmed, all orders PAID')

  try {
    const { notifyBatchPaymentConfirmed } = await import('./bot/core')
    const freshPoint = await prisma.point.findUnique({ where: { id: batch.pointId } })
    const agentOffline = freshPoint ? !isPointAgentOnline(freshPoint) : true
    await notifyBatchPaymentConfirmed(batch.user, batchId, batch.orders.length, agentOffline)
  } catch (error) {
    console.error('[batch] payment notify failed:', batchId, error)
  }

  try {
    const { notifyStaffBatchPaymentConfirmed } = await import('./staff-notify')
    await notifyStaffBatchPaymentConfirmed({
      ...batch,
      orders: batch.orders.filter(isActiveBatchOrder),
    })
  } catch (error) {
    console.error('[staff] batch payment confirmed notify failed:', batchId, error)
  }

  return {
    id: batch.id,
    status: OrderBatchStatus.PAID,
    paidAt: now.toISOString(),
  }
}

export async function getBatchWithOrders(batchId: string) {
  const batch = await prisma.orderBatch.findUnique({
    where: { id: batchId },
    include: {
      orders: { orderBy: { batchIndex: 'asc' } },
      user: true,
      point: true,
    },
  })

  if (!batch) {
    throw createError({
      statusCode: 404,
      data: { error: 'Batch not found', code: 'BATCH_NOT_FOUND' },
    })
  }

  return batch
}

export async function checkBatchCompletion(batchId: string): Promise<void> {
  const batch = await prisma.orderBatch.findUnique({
    where: { id: batchId },
    include: {
      orders: { orderBy: { batchIndex: 'asc' } },
      user: true,
    },
  })

  if (!batch || batch.status !== OrderBatchStatus.PAID) {
    return
  }

  const terminal = batch.orders.every(
    (o) => o.status === OrderStatus.PRINTED || o.status === OrderStatus.FAILED,
  )
  if (!terminal) {
    return
  }

  const allPrinted = batch.orders.every((o) => o.status === OrderStatus.PRINTED)
  const failedOrders = batch.orders.filter((o) => o.status === OrderStatus.FAILED)
  const newStatus = allPrinted
    ? OrderBatchStatus.COMPLETED
    : OrderBatchStatus.PARTIALLY_FAILED

  await prisma.orderBatch.update({
    where: { id: batchId },
    data: { status: newStatus },
  })

  batchLog(batchId, `batch finished: ${newStatus}`)

  try {
    const { notifyBatchPrintComplete, notifyBatchPrintPartialFailure } = await import('./bot/core')
    if (allPrinted) {
      await notifyBatchPrintComplete(batch.user, batchId, batch.orders.length)
    } else {
      await notifyBatchPrintPartialFailure(
        batch.user,
        batchId,
        failedOrders.map((o) => ({ id: o.id, fileName: o.fileName })),
        batch.orders.length,
      )
    }
  } catch (error) {
    console.error('[batch] completion notify failed:', batchId, error)
  }
}

export async function notifyBatchPrintStartedIfNeeded(batchId: string, orderId: string): Promise<void> {
  const batch = await prisma.orderBatch.findUnique({
    where: { id: batchId },
    include: { orders: true, user: true },
  })
  if (!batch) {
    return
  }

  const printingOrDone = batch.orders.filter(
    (o) =>
      o.status === OrderStatus.PRINTING
      || o.status === OrderStatus.PRINTED
      || o.status === OrderStatus.FAILED,
  )

  if (printingOrDone.length !== 1 || printingOrDone[0]?.id !== orderId) {
    return
  }

  try {
    const { notifyBatchPrintStarted } = await import('./bot/core')
    await notifyBatchPrintStarted(batch.user, batchId, 1, batch.orders.length)
  } catch (error) {
    console.error('[batch] print started notify failed:', batchId, error)
  }
}
