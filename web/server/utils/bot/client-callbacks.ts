import {
  BATCH_REMOVE_CANCEL_PREFIX,
  parseBatchRemoveCancelOrderId,
  parseBatchRemoveConfirmOrderId,
  parseBatchRemoveOrderId,
  parsePayChangeMethodPayload,
  parsePayCheckEntityPayload,
  parsePayCheckStatusPayload,
  parsePayClaimedPayload,
  parsePayMethodPayload,
  parseOrderRetryPayload,
  parseOrderRefundRequestPayload,
  parseBatchRefundRequestPayload,
  parseOrderCopiesPayload,
  parsePointListPagePayload,
  parsePointSelectPayload,
} from './keyboards'
import { parseClientCommandCallback } from './client-commands'
import { parsePartnerCommandCallback } from './partner-commands'
import type {
  BotUser,
  CallbackContext,
  ClientCallbackResult,
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
): Promise<ClientCallbackResult> {
  const orderIdFromRemove = parseBatchRemoveOrderId(data)
  if (orderIdFromRemove) {
    const { handleBatchRemoveRequest } = await import('./core')
    return { toast: await handleBatchRemoveRequest(target, user, orderIdFromRemove, adapter, callbackCtx, message) }
  }

  const orderIdFromConfirm = parseBatchRemoveConfirmOrderId(data)
  if (orderIdFromConfirm) {
    const { handleBatchRemoveConfirm } = await import('./core')
    return { toast: await handleBatchRemoveConfirm(target, user, orderIdFromConfirm, adapter, callbackCtx, message) }
  }

  if (data === BATCH_REMOVE_CANCEL_PREFIX || data.startsWith(BATCH_REMOVE_CANCEL_PREFIX)) {
    const orderId = parseBatchRemoveCancelOrderId(data)
    if (orderId) {
      const { handleBatchRemoveCancel } = await import('./core')
      return { toast: await handleBatchRemoveCancel(target, user, orderId, adapter, callbackCtx, message) }
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
    return { toast: await handlePaymentClaimed(target, user, claimedId, adapter) }
  }

  const changeId = parsePayChangeMethodPayload(data)
  if (changeId) {
    const { handlePaymentChangeMethod } = await import('./payment-handlers')
    return handlePaymentChangeMethod(target, user, changeId, adapter)
  }

  const checkPaymentId = parsePayCheckStatusPayload(data)
  if (checkPaymentId) {
    const { handlePaymentCheckStatus } = await import('./payment-handlers')
    return { toast: await handlePaymentCheckStatus(target, user, checkPaymentId, adapter) }
  }

  const checkEntityId = parsePayCheckEntityPayload(data)
  if (checkEntityId) {
    const { handlePaymentCheckStatusByEntity } = await import('./payment-handlers')
    return { toast: await handlePaymentCheckStatusByEntity(target, user, checkEntityId, adapter) }
  }

  const retryOrderId = parseOrderRetryPayload(data)
  if (retryOrderId) {
    const { handleClientOrderRetry } = await import('./core')
    return { toast: await handleClientOrderRetry(user, retryOrderId) }
  }

  const refundOrderId = parseOrderRefundRequestPayload(data)
  if (refundOrderId) {
    const { handleClientRefundRequest } = await import('../refund-actions')
    return { toast: await handleClientRefundRequest(user, refundOrderId) }
  }

  const refundBatchId = parseBatchRefundRequestPayload(data)
  if (refundBatchId) {
    const { handleClientBatchRefundRequest } = await import('../refund-actions')
    return { toast: await handleClientBatchRefundRequest(user, refundBatchId) }
  }

  const copiesChange = parseOrderCopiesPayload(data)
  if (copiesChange) {
    const { handleOrderCopiesChange } = await import('./core')
    return {
      toast: await handleOrderCopiesChange(
        target,
        user,
        copiesChange.orderId,
        copiesChange.delta,
        adapter,
        callbackCtx,
        message,
      ),
    }
  }

  if (data.startsWith('order_copies_nop:')) {
    return { toast: '' }
  }

  const pointSlug = parsePointSelectPayload(data)
  if (pointSlug) {
    const { handlePointSelect } = await import('./point-selection')
    return {
      toast: await handlePointSelect(target, user, pointSlug, adapter, {
        callbackMessage: message,
      }),
    }
  }

  if (data === 'point_list') {
    const { handlePointList } = await import('./point-selection')
    return { toast: await handlePointList(target, user, adapter) }
  }

  const listPage = parsePointListPagePayload(data)
  if (listPage !== null) {
    const { handlePointList } = await import('./point-selection')
    return { toast: await handlePointList(target, user, adapter, listPage) }
  }

  if (data === 'point_change') {
    const { handlePointChangeMenu } = await import('./point-selection')
    return { toast: await handlePointChangeMenu(target, adapter) }
  }

  if (data === 'point_back') {
    const { handlePointBack } = await import('./point-selection')
    return { toast: await handlePointBack(target, user, adapter) }
  }

  const clientCommand = parseClientCommandCallback(data)
  if (clientCommand) {
    const { handleClientCommand } = await import('./client-commands')
    await handleClientCommand(clientCommand, target.platform, target, user, adapter)
    return { toast: 'Готово' }
  }

  const partnerCommand = parsePartnerCommandCallback(data)
  if (partnerCommand) {
    const { handlePartnerQuickCommand } = await import('./partner-commands')
    await handlePartnerQuickCommand(partnerCommand, target.platform, target, user, adapter)
    return { toast: 'Готово' }
  }

  throw new Error('Неизвестное действие')
}
