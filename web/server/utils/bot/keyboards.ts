import {
  BTN_CANCEL_BATCH,
  BTN_FINALIZE_BATCH,
  BTN_REMOVE_CANCEL,
  BTN_REMOVE_CONFIRM,
  BTN_REMOVE_FILE,
  BTN_RETRY_PRINT,
} from './messages'
import type { InlineKeyboardButton } from './types'

export function batchRemovePayload(orderId: string): string {
  return `batch_remove:${orderId}`
}

export function batchRemoveConfirmPayload(orderId: string): string {
  return `batch_remove_confirm:${orderId}`
}

export const BATCH_REMOVE_CANCEL_PREFIX = 'batch_remove_cancel:'

export function batchRemoveCancelPayload(orderId: string): string {
  return `${BATCH_REMOVE_CANCEL_PREFIX}${orderId}`
}

export function removeFileKeyboard(orderId: string): InlineKeyboardButton[][] {
  return [[{ text: BTN_REMOVE_FILE, callbackData: batchRemovePayload(orderId) }]]
}

export function removeConfirmKeyboard(orderId: string): InlineKeyboardButton[][] {
  return [[
    { text: BTN_REMOVE_CONFIRM, callbackData: batchRemoveConfirmPayload(orderId) },
    { text: BTN_REMOVE_CANCEL, callbackData: batchRemoveCancelPayload(orderId) },
  ]]
}

export function maxBatchActionButtons(mode: 'calculating' | 'ready') {
  return mode === 'ready'
    ? [
        { type: 'callback' as const, text: BTN_FINALIZE_BATCH, payload: 'batch_finalize', intent: 'default' as const },
        { type: 'callback' as const, text: BTN_CANCEL_BATCH, payload: 'batch_cancel', intent: 'default' as const },
      ]
    : [
        { type: 'callback' as const, text: BTN_CANCEL_BATCH, payload: 'batch_cancel', intent: 'default' as const },
      ]
}

export function maxRemoveFileAttachment(orderId: string) {
  return {
    type: 'inline_keyboard' as const,
    payload: {
      buttons: removeFileKeyboard(orderId).map((row) =>
        row.map((btn) => ({
          type: 'callback' as const,
          text: btn.text,
          payload: btn.callbackData,
          intent: 'default' as const,
        })),
      ),
    },
  }
}

export function maxRemoveConfirmAttachment(orderId: string) {
  return {
    type: 'inline_keyboard' as const,
    payload: {
      buttons: removeConfirmKeyboard(orderId).map((row) =>
        row.map((btn) => ({
          type: 'callback' as const,
          text: btn.text,
          payload: btn.callbackData,
          intent: 'default' as const,
        })),
      ),
    },
  }
}

export function isBatchClientCallbackPayload(payload: string): boolean {
  return payload === 'batch_finalize'
    || payload === 'batch_cancel'
    || payload.startsWith('batch_remove:')
    || payload.startsWith('batch_remove_confirm:')
    || payload.startsWith('batch_remove_cancel:')
}

export function parseBatchRemoveCancelOrderId(payload: string): string | null {
  if (payload.startsWith(BATCH_REMOVE_CANCEL_PREFIX)) {
    return payload.slice(BATCH_REMOVE_CANCEL_PREFIX.length)
  }
  return null
}

export function parseBatchRemoveOrderId(payload: string): string | null {
  if (payload.startsWith('batch_remove_confirm:')
    || payload.startsWith(BATCH_REMOVE_CANCEL_PREFIX)) {
    return null
  }
  if (payload.startsWith('batch_remove:')) {
    return payload.slice('batch_remove:'.length)
  }
  return null
}

export function parseBatchRemoveConfirmOrderId(payload: string): string | null {
  if (payload.startsWith('batch_remove_confirm:')) {
    return payload.slice('batch_remove_confirm:'.length)
  }
  return null
}


export const BTN_PAY_SBP = 'перевод'
export const BTN_PAY_ON_SITE = 'на месте'
export const BTN_PAY_ONLINE_SBP = 'СБП'
export const BTN_PAY_ONLINE_CARD = 'карта'
export const BTN_PAY_CLAIMED = 'Я оплатил'
export const BTN_PAY_CHECK_STATUS = 'Проверить'
export const BTN_PAY_CHANGE_METHOD = '← Назад'

export type PayMethodCallback =
  | 'sbp_transfer'
  | 'on_site'
  | 'tbank_sbp'
  | 'tbank_card'
  | 'tbank_online'

export function payCheckStatusPayload(paymentId: string): string {
  return `pay_check_status:${paymentId}`
}

export function payCheckEntityPayload(entityId: string): string {
  return `pay_check_entity:${entityId}`
}

export function payMethodPayload(method: PayMethodCallback, entityId: string): string {
  return `pay_method:${method}:${entityId}`
}

export function payClaimedPayload(entityId: string): string {
  return `pay_claimed:${entityId}`
}

export function payChangeMethodPayload(entityId: string): string {
  return `pay_change_method:${entityId}`
}

export function paymentMethodKeyboard(
  entityId: string,
  methods: Array<'SBP_TRANSFER' | 'ON_SITE' | 'TBANK_SBP' | 'TBANK_ONLINE'>,
  options?: {
    onlineUrls?: Partial<Record<'TBANK_SBP' | 'TBANK_ONLINE', string>>
  },
): InlineKeyboardButton[][] {
  const rows: InlineKeyboardButton[][] = []
  const manualRow: InlineKeyboardButton[] = []
  if (methods.includes('SBP_TRANSFER')) {
    manualRow.push({ text: BTN_PAY_SBP, callbackData: payMethodPayload('sbp_transfer', entityId) })
  }
  if (methods.includes('ON_SITE')) {
    manualRow.push({ text: BTN_PAY_ON_SITE, callbackData: payMethodPayload('on_site', entityId) })
  }
  if (manualRow.length) {
    rows.push(manualRow)
  }
  const onlineRow: InlineKeyboardButton[] = []
  if (methods.includes('TBANK_SBP')) {
    const sbpUrl = options?.onlineUrls?.TBANK_SBP
    onlineRow.push(sbpUrl
      ? { text: BTN_PAY_ONLINE_SBP, url: sbpUrl }
      : { text: BTN_PAY_ONLINE_SBP, callbackData: payMethodPayload('tbank_sbp', entityId) })
  }
  if (methods.includes('TBANK_ONLINE')) {
    const cardUrl = options?.onlineUrls?.TBANK_ONLINE
    onlineRow.push(cardUrl
      ? { text: BTN_PAY_ONLINE_CARD, url: cardUrl }
      : { text: BTN_PAY_ONLINE_CARD, callbackData: payMethodPayload('tbank_card', entityId) })
  }
  if (onlineRow.length) {
    rows.push(onlineRow)
  }
  if (methods.includes('TBANK_SBP') || methods.includes('TBANK_ONLINE')) {
    rows.push([{ text: BTN_PAY_CHECK_STATUS, callbackData: payCheckEntityPayload(entityId) }])
  }
  return rows
}

export function transferClaimedKeyboard(entityId: string): InlineKeyboardButton[][] {
  return [[
    { text: BTN_PAY_CLAIMED, callbackData: payClaimedPayload(entityId) },
    { text: BTN_PAY_CHANGE_METHOD, callbackData: payChangeMethodPayload(entityId) },
  ]]
}

export function onSitePaymentKeyboard(entityId: string): InlineKeyboardButton[][] {
  return [[{ text: BTN_PAY_CHANGE_METHOD, callbackData: payChangeMethodPayload(entityId) }]]
}

export function onlinePaymentCheckKeyboard(
  entityId: string,
  paymentId: string,
): InlineKeyboardButton[][] {
  return [[
    { text: BTN_PAY_CHECK_STATUS, callbackData: payCheckStatusPayload(paymentId) },
    { text: BTN_PAY_CHANGE_METHOD, callbackData: payChangeMethodPayload(entityId) },
  ]]
}

export function isPaymentClientCallbackPayload(payload: string): boolean {
  return payload.startsWith('pay_method:')
    || payload.startsWith('pay_claimed:')
    || payload.startsWith('pay_change_method:')
    || payload.startsWith('pay_check_status:')
    || payload.startsWith('pay_check_entity:')
}

const PAY_METHOD_CALLBACKS = new Set<PayMethodCallback>([
  'sbp_transfer',
  'on_site',
  'tbank_sbp',
  'tbank_card',
  'tbank_online',
])

export function parsePayMethodPayload(
  payload: string,
): { method: PayMethodCallback, entityId: string } | null {
  if (!payload.startsWith('pay_method:')) return null
  const rest = payload.slice('pay_method:'.length)
  const idx = rest.indexOf(':')
  if (idx < 0) return null
  const method = rest.slice(0, idx) as PayMethodCallback
  if (!PAY_METHOD_CALLBACKS.has(method)) return null
  return { method, entityId: rest.slice(idx + 1) }
}

export function parsePayClaimedPayload(payload: string): string | null {
  if (!payload.startsWith('pay_claimed:')) return null
  return payload.slice('pay_claimed:'.length) || null
}

export function parsePayChangeMethodPayload(payload: string): string | null {
  if (!payload.startsWith('pay_change_method:')) return null
  return payload.slice('pay_change_method:'.length) || null
}

export function parsePayCheckStatusPayload(payload: string): string | null {
  if (!payload.startsWith('pay_check_status:')) return null
  return payload.slice('pay_check_status:'.length) || null
}

export function parsePayCheckEntityPayload(payload: string): string | null {
  if (!payload.startsWith('pay_check_entity:')) return null
  return payload.slice('pay_check_entity:'.length) || null
}

export function orderRetryPayload(orderId: string): string {
  return `order_retry:${orderId}`
}

export function parseOrderRetryPayload(payload: string): string | null {
  if (!payload.startsWith('order_retry:')) return null
  return payload.slice('order_retry:'.length) || null
}

export function isPrintRetryClientCallbackPayload(payload: string): boolean {
  return payload.startsWith('order_retry:')
}

export function printRetryKeyboard(
  failedOrders: Array<{ id: string, fileName: string }>,
): InlineKeyboardButton[][] {
  if (failedOrders.length === 1) {
    return [[{ text: BTN_RETRY_PRINT, callbackData: orderRetryPayload(failedOrders[0]!.id) }]]
  }

  return failedOrders.map((order) => [{
    text: `${BTN_RETRY_PRINT} ${truncateFileName(order.fileName)}`,
    callbackData: orderRetryPayload(order.id),
  }])
}

function truncateFileName(fileName: string, maxLen = 24): string {
  if (fileName.length <= maxLen) {
    return fileName
  }
  return `${fileName.slice(0, maxLen - 1)}…`
}
