import {
  BATCH_REMOVE_CANCEL_PREFIX,
  parseBatchRemoveCancelOrderId,
  parseBatchRemoveConfirmOrderId,
  parseBatchRemoveOrderId,
  parsePayChangeMethodPayload,
  parsePayCheckStatusPayload,
  parsePayClaimedPayload,
  parsePayMethodPayload,
} from './keyboards'
import type {
  BotUser,
  CallbackContext,
  MessengerAdapter,
  MessengerReplyTarget,
  SentMessage,
} from './types'

export async function routeClientCallback(
  data: string,
  target: MessengerReplyTarget,
  user: BotUser,
  adapter: MessengerAdapter,
  callbackCtx: CallbackContext,
  message?: SentMessage,
): Promise<string> {
  const orderIdFromRemove = parseBatchRemoveOrderId(data)
  if (orderIdFromRemove) {
    const { handleBatchRemoveRequest } = await import('./core')
    return handleBatchRemoveRequest(target, user, orderIdFromRemove, adapter, callbackCtx, message)
  }

  const orderIdFromConfirm = parseBatchRemoveConfirmOrderId(data)
  if (orderIdFromConfirm) {
    const { handleBatchRemoveConfirm } = await import('./core')
    return handleBatchRemoveConfirm(target, user, orderIdFromConfirm, adapter, callbackCtx, message)
  }

  if (data === BATCH_REMOVE_CANCEL_PREFIX || data.startsWith(BATCH_REMOVE_CANCEL_PREFIX)) {
    const orderId = parseBatchRemoveCancelOrderId(data)
    if (orderId) {
      const { handleBatchRemoveCancel } = await import('./core')
      return handleBatchRemoveCancel(target, user, orderId, adapter, callbackCtx, message)
    }
  }

  const payMethod = parsePayMethodPayload(data)
  if (payMethod) {
    const { handlePaymentMethodChoice } = await import('./payment-handlers')
    return handlePaymentMethodChoice(target, user, payMethod.method, payMethod.entityId, adapter)
  }

  const claimedId = parsePayClaimedPayload(data)
  if (claimedId) {
    const { handlePaymentClaimed } = await import('./payment-handlers')
    return handlePaymentClaimed(target, user, claimedId, adapter)
  }

  const changeId = parsePayChangeMethodPayload(data)
  if (changeId) {
    const { handlePaymentChangeMethod } = await import('./payment-handlers')
    return handlePaymentChangeMethod(target, user, changeId, adapter)
  }

  const checkPaymentId = parsePayCheckStatusPayload(data)
  if (checkPaymentId) {
    const { handlePaymentCheckStatus } = await import('./payment-handlers')
    return handlePaymentCheckStatus(target, user, checkPaymentId, adapter)
  }

  throw new Error('Неизвестное действие')
}
