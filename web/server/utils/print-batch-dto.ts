import type { Order, OrderBatch, Point } from '@prisma/client'
import { isActiveBatchOrder } from './batch'

export type PrintBatchPoint = Pick<
  Point,
  'id' | 'slug' | 'name' | 'address' | 'displayCode' | 'pricePerPageKopeks' | 'citySlug'
>

export type PrintBatchOrderDto = {
  id: string
  fileName: string
  status: string
  pageCount: number
  copies: number
  amountKopeks: number
  batchIndex: number | null
  errorMessage: string | null
}

export type PrintBatchDto = {
  id: string
  status: string
  totalPages: number
  totalAmountKopeks: number
  shortId: string
  paymentMethod: string | null
  point: PrintBatchPoint | null
  orders: PrintBatchOrderDto[]
  createdAt: string
  updatedAt: string
}

export function serializePrintOrder(order: Order): PrintBatchOrderDto {
  return {
    id: order.id,
    fileName: order.fileName,
    status: order.status,
    pageCount: order.pageCount,
    copies: order.copies,
    amountKopeks: order.amountKopeks,
    batchIndex: order.batchIndex,
    errorMessage: order.errorMessage,
  }
}

export function serializePrintBatch(
  batch: OrderBatch & {
    orders: Order[]
    point: PrintBatchPoint | null
  },
): PrintBatchDto {
  return {
    id: batch.id,
    status: batch.status,
    totalPages: batch.totalPages,
    totalAmountKopeks: batch.totalAmountKopeks,
    shortId: batch.id.slice(-6),
    paymentMethod: batch.paymentMethod,
    point: batch.point,
    orders: batch.orders.filter(isActiveBatchOrder).map(serializePrintOrder),
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
  }
}
