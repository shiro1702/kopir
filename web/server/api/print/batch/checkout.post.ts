import { PaymentMethod } from '@prisma/client'
import { finalizeBatch, getActiveCollectingBatch } from '../../../utils/batch'
import { getEnabledPaymentMethods } from '../../../utils/payment-config'
import { selectPaymentMethodByUserId } from '../../../utils/payments/service'
import {
  initPayment,
  type TbankPayChannel,
} from '../../../utils/payments/providers/tbank-acquiring'
import { serializePrintBatch } from '../../../utils/print-batch-dto'
import {
  assertPrintRateLimit,
  requirePrintSessionUser,
} from '../../../utils/print-session'
import { prisma } from '../../../utils/prisma'

interface CheckoutBody {
  channel?: 'sbp' | 'card'
}

function pickTbankMethod(enabled: PaymentMethod[], channel: TbankPayChannel): PaymentMethod {
  if (channel === 'card') {
    if (enabled.includes(PaymentMethod.TBANK_ONLINE)) {
      return PaymentMethod.TBANK_ONLINE
    }
    throw createError({
      statusCode: 400,
      data: { error: 'Оплата картой недоступна', code: 'PAYMENT_METHOD_UNAVAILABLE' },
    })
  }
  if (enabled.includes(PaymentMethod.TBANK_SBP)) {
    return PaymentMethod.TBANK_SBP
  }
  if (enabled.includes(PaymentMethod.TBANK_ONLINE)) {
    return PaymentMethod.TBANK_ONLINE
  }
  throw createError({
    statusCode: 400,
    data: { error: 'Онлайн-оплата недоступна для этой точки', code: 'PAYMENT_METHOD_UNAVAILABLE' },
  })
}

export default defineEventHandler(async (event) => {
  const user = await requirePrintSessionUser(event)
  assertPrintRateLimit(`print-checkout:${user.id}`, 10, 60_000)

  const body = await readBody<CheckoutBody>(event).catch(() => ({} as CheckoutBody))
  const channel: TbankPayChannel = body?.channel === 'card' ? 'card' : 'sbp'

  const collecting = await getActiveCollectingBatch(user.id)
  if (!collecting) {
    throw createError({
      statusCode: 400,
      data: { error: 'Нет активного заказа', code: 'NO_BATCH' },
    })
  }

  const { batch: finalized } = await finalizeBatch(collecting.id)
  const batch = await prisma.orderBatch.findUnique({
    where: { id: finalized.id },
    include: {
      orders: { orderBy: { batchIndex: 'asc' } },
      user: true,
      point: true,
    },
  })
  if (!batch?.point) {
    throw createError({
      statusCode: 400,
      data: { error: 'Сначала выберите точку печати', code: 'POINT_NOT_SELECTED' },
    })
  }
  const point = batch.point

  const enabled = getEnabledPaymentMethods(point)
  const method = pickTbankMethod(enabled, channel)
  const result = await selectPaymentMethodByUserId(batch.id, method, user.id)

  if (result.kind !== 'batch') {
    throw createError({
      statusCode: 500,
      data: { error: 'Unexpected payment entity', code: 'INTERNAL' },
    })
  }

  const amountKopeks = result.batch.totalAmountKopeks
  const shortId = batch.id.slice(-6)
  const init = await initPayment({
    kind: 'batch',
    entityId: batch.id,
    shortId,
    amountKopeks,
    paymentMethod: method,
    point,
    user: result.batch.user,
    batch: result.batch,
  }, channel)

  const fresh = await prisma.orderBatch.findUnique({
    where: { id: batch.id },
    include: {
      orders: { orderBy: { batchIndex: 'asc' } },
      point: {
        select: {
          id: true,
          slug: true,
          name: true,
          address: true,
          displayCode: true,
          pricePerPageKopeks: true,
          citySlug: true,
        },
      },
    },
  })

  return {
    batch: fresh ? serializePrintBatch(fresh) : null,
    payment: {
      paymentId: init.paymentId,
      payUrl: init.payUrl,
      channel: init.channel,
      amountKopeks: init.amountKopeks,
      shortId,
    },
  }
})
