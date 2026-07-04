import { PaymentMethod } from '@prisma/client'
import { isTbankConfigured } from '../tbank-config'
import { initPayment, type TbankPayChannel } from './providers/tbank-acquiring'
import { resolvePaymentEntity, selectPaymentMethod } from './service'
import type { PaymentContext } from './types'

type MaxOnlinePaymentKey = 'TBANK_SBP' | 'TBANK_ONLINE'

const ONLINE_METHODS: Array<{
  key: MaxOnlinePaymentKey
  method: PaymentMethod
  channel: TbankPayChannel
}> = [
  { key: 'TBANK_SBP', method: PaymentMethod.TBANK_SBP, channel: 'sbp' },
  { key: 'TBANK_ONLINE', method: PaymentMethod.TBANK_ONLINE, channel: 'card' },
]

function buildPaymentContext(
  entityId: string,
  shortId: string,
  selected: Awaited<ReturnType<typeof selectPaymentMethod>>,
): PaymentContext {
  const amountKopeks = selected.kind === 'batch'
    ? selected.batch.totalAmountKopeks
    : selected.order.amountKopeks
  const point = selected.kind === 'batch'
    ? selected.batch.point
    : selected.order.point

  return {
    kind: selected.kind,
    entityId,
    shortId,
    amountKopeks,
    paymentMethod: selected.method,
    point,
    user: selected.kind === 'batch' ? selected.batch.user : selected.order.user,
    batch: selected.kind === 'batch' ? selected.batch : undefined,
    order: selected.kind === 'order' ? selected.order : undefined,
  }
}

export async function prepareMaxOnlinePaymentUrls(
  entityId: string,
  userExternalId: string,
  methods: PaymentMethod[],
): Promise<Partial<Record<MaxOnlinePaymentKey, string>>> {
  if (!isTbankConfigured()) {
    return {}
  }

  const enabled = ONLINE_METHODS.filter((item) => methods.includes(item.method))
  if (enabled.length === 0) {
    return {}
  }

  await resolvePaymentEntity(entityId)

  const shortId = entityId.slice(-6)
  const urls: Partial<Record<MaxOnlinePaymentKey, string>> = {}
  let preservePending = false

  for (const item of enabled) {
    try {
      const selected = await selectPaymentMethod(entityId, item.method, userExternalId)
      const init = await initPayment(
        buildPaymentContext(entityId, shortId, selected),
        item.channel,
        { preservePending },
      )
      urls[item.key] = init.payUrl
      preservePending = true
    } catch (error) {
      console.error('[payment] failed to prepare MAX URL', {
        entityId,
        method: item.method,
        error,
      })
    }
  }

  return urls
}
