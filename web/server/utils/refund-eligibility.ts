import { OrderStatus, PaymentStatus } from '@prisma/client'
import { isTbankPaymentMethod } from './payments/methods'
import { prisma } from './prisma'

export type RefundEligibility = {
  orderId: string
  batchId: string | null
  pointId: string
  status: OrderStatus
  paymentMethod: import('@prisma/client').PaymentMethod | null
  amountKopeks: number
  canRefundOnline: boolean
  alreadyRefunded: boolean
  isRefundLeader: boolean
}

export async function getOrderRefundEligibility(orderId: string): Promise<RefundEligibility | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      batch: {
        select: {
          paymentMethod: true,
          totalAmountKopeks: true,
          payments: {
            where: { status: { in: [PaymentStatus.CONFIRMED, PaymentStatus.REFUNDED] } },
            orderBy: { confirmedAt: 'desc' },
            take: 1,
            select: { id: true, status: true, externalId: true, amountKopeks: true },
          },
        },
      },
      payments: {
        where: { status: { in: [PaymentStatus.CONFIRMED, PaymentStatus.REFUNDED] } },
        orderBy: { confirmedAt: 'desc' },
        take: 1,
        select: { id: true, status: true, externalId: true, amountKopeks: true },
      },
    },
  })

  if (!order) {
    return null
  }

  const isRefundLeader = !order.batchId || order.batchIndex === 1
  const paymentMethod = order.batchId
    ? order.batch?.paymentMethod ?? order.paymentMethod
    : order.paymentMethod
  const latestPayment = order.batchId
    ? (order.batch?.payments[0] ?? null)
    : (order.payments[0] ?? null)
  const amountKopeks = order.batchId
    ? (order.batch?.totalAmountKopeks ?? order.amountKopeks)
    : order.amountKopeks
  const alreadyRefunded = latestPayment?.status === PaymentStatus.REFUNDED
  const canRefundOnline = isTbankPaymentMethod(paymentMethod)
    && isRefundLeader
    && latestPayment?.status === PaymentStatus.CONFIRMED
    && Boolean(latestPayment.externalId)

  return {
    orderId: order.id,
    batchId: order.batchId,
    pointId: order.pointId,
    status: order.status,
    paymentMethod,
    amountKopeks,
    canRefundOnline,
    alreadyRefunded,
    isRefundLeader,
  }
}

export async function canPartnerRefundOrder(orderId: string): Promise<boolean> {
  const eligibility = await getOrderRefundEligibility(orderId)
  return eligibility?.canRefundOnline === true && eligibility.status === OrderStatus.FAILED
}
