import {
  BTN_CANCEL_BATCH,
  BTN_FINALIZE_BATCH,
  BTN_POINT_BACK,
  BTN_POINT_GEO,
  BTN_POINT_LIST,
  BTN_POINT_MAP,
  BTN_REMOVE_CANCEL,
  BTN_REMOVE_CONFIRM,
  BTN_REMOVE_FILE,
  BTN_RETRY_PRINT,
  BTN_REQUEST_REFUND,
  BTN_PARTNER_REFUND,
  BTN_PARTNER_MANUAL_PRINT,
  BTN_SELECT_POINT,
  BTN_CHANGE_POINT,
  BTN_SELECT_OTHER_POINT,
} from './messages'
import { isPointAgentOnline } from '../points'
import type { InlineKeyboardButton } from './types'
import type { BatchKeyboardMode } from './types'

export const POINTS_PER_PAGE = 6

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

export function orderCopiesDecPayload(orderId: string): string {
  return `order_copies_dec:${orderId}`
}

export function orderCopiesIncPayload(orderId: string): string {
  return `order_copies_inc:${orderId}`
}

export function formatCopiesButtonLabel(copies: number): string {
  const n = Math.max(1, Math.round(copies))
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) {
    return `${n} копия`
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${n} копии`
  }
  return `${n} копий`
}

export function parseOrderCopiesPayload(payload: string): { orderId: string, delta: -1 | 1 } | null {
  if (payload.startsWith('order_copies_dec:')) {
    const orderId = payload.slice('order_copies_dec:'.length)
    return orderId ? { orderId, delta: -1 } : null
  }
  if (payload.startsWith('order_copies_inc:')) {
    const orderId = payload.slice('order_copies_inc:'.length)
    return orderId ? { orderId, delta: 1 } : null
  }
  return null
}

export function isOrderCopiesCallbackPayload(payload: string): boolean {
  return payload.startsWith('order_copies_dec:') || payload.startsWith('order_copies_inc:')
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

export function maxBatchActionButtons(mode: BatchKeyboardMode) {
  if (mode === 'ready') {
    return [
      { type: 'callback' as const, text: BTN_FINALIZE_BATCH, payload: 'batch_finalize', intent: 'default' as const },
      { type: 'callback' as const, text: BTN_CANCEL_BATCH, payload: 'batch_cancel', intent: 'default' as const },
    ]
  }
  return [
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
    || isOrderCopiesCallbackPayload(payload)
    || payload.startsWith('order_copies_nop:')
}

export const POINT_SELECT_PREFIX = 'point_select:'
export const POINT_LIST_PAGE_PREFIX = 'point_list_page:'

export function pointSelectPayload(slug: string): string {
  return `${POINT_SELECT_PREFIX}${slug}`
}

export function pointListPagePayload(page: number): string {
  return `${POINT_LIST_PAGE_PREFIX}${page}`
}

export function parsePointSelectPayload(payload: string): string | null {
  if (!payload.startsWith(POINT_SELECT_PREFIX)) return null
  return payload.slice(POINT_SELECT_PREFIX.length) || null
}

export function parsePointListPagePayload(payload: string): number | null {
  if (!payload.startsWith(POINT_LIST_PAGE_PREFIX)) return null
  const page = Number.parseInt(payload.slice(POINT_LIST_PAGE_PREFIX.length), 10)
  return Number.isFinite(page) && page >= 0 ? page : null
}

export function isPointClientCallbackPayload(payload: string): boolean {
  return payload.startsWith(POINT_SELECT_PREFIX)
    || payload === 'point_change'
    || payload === 'point_list'
    || payload === 'point_geo'
    || payload.startsWith(POINT_LIST_PAGE_PREFIX)
    || payload === 'point_back'
}

export interface PointListItem {
  slug: string
  name: string
  displayCode?: string | null
  lastSeenAt?: Date | null
  statusText?: string
  canSelect?: boolean
}

function formatPointListButtonText(point: PointListItem): string {
  const online = point.lastSeenAt != null && isPointAgentOnline(point)
  const status = online ? '🟢 ' : '🔴 '
  const label = point.displayCode ? `${point.name} (${point.displayCode})` : point.name
  const schedule = point.statusText ? ` · ${point.statusText}` : ''
  return `${status}${label}${schedule}`
}

export function pointSelectKeyboard(
  points: PointListItem[],
  page = 0,
): InlineKeyboardButton[][] {
  const start = page * POINTS_PER_PAGE
  const slice = points.slice(start, start + POINTS_PER_PAGE)
  const rows: InlineKeyboardButton[][] = slice.map((point) => [{
    text: formatPointListButtonText(point),
    callbackData: point.canSelect === false ? `point_select_blocked:${point.slug}` : pointSelectPayload(point.slug),
  }])

  const nav: InlineKeyboardButton[] = []
  if (page > 0) {
    nav.push({ text: '◀️', callbackData: pointListPagePayload(page - 1) })
  }
  if (start + POINTS_PER_PAGE < points.length) {
    nav.push({ text: '▶️', callbackData: pointListPagePayload(page + 1) })
  }
  if (nav.length) {
    rows.push(nav)
  }
  rows.push([{ text: BTN_POINT_BACK, callbackData: 'point_back' }])
  return rows
}

export function pointChangeMenuKeyboard(options?: { miniAppUrl?: string | null }): InlineKeyboardButton[][] {
  const rows: InlineKeyboardButton[][] = [[
    { text: BTN_POINT_LIST, callbackData: 'point_list' },
    { text: BTN_POINT_GEO, callbackData: 'point_geo' },
  ]]
  if (options?.miniAppUrl) {
    rows.unshift([{ text: BTN_POINT_MAP, webAppUrl: options.miniAppUrl }])
  }
  rows.push([{ text: BTN_POINT_BACK, callbackData: 'point_back' }])
  return rows
}

export function pointOfflineStartKeyboard(hasOtherPoints: boolean): InlineKeyboardButton[][] {
  if (!hasOtherPoints) {
    return []
  }
  return [[{ text: BTN_SELECT_OTHER_POINT, callbackData: 'point_list' }]]
}

export function fileStatusKeyboard(
  orderId: string,
  options: {
    withRemove: boolean
    keyboardMode: BatchKeyboardMode
    hasOtherPoints?: boolean
    withCopies?: boolean
    copies?: number
  },
): InlineKeyboardButton[][] {
  const rows: InlineKeyboardButton[][] = []
  if (options.keyboardMode === 'needs_point') {
    rows.push([{ text: BTN_SELECT_POINT, callbackData: 'point_list' }])
  } else if (options.keyboardMode === 'ready') {
    rows.push([{ text: BTN_CHANGE_POINT, callbackData: 'point_change' }])
  } else if (options.keyboardMode === 'point_offline' && options.hasOtherPoints) {
    rows.push([{ text: BTN_SELECT_OTHER_POINT, callbackData: 'point_list' }])
  }
  if (options.withCopies) {
    const copies = options.copies ?? 1
    rows.push([
      { text: '−', callbackData: orderCopiesDecPayload(orderId) },
      { text: formatCopiesButtonLabel(copies), callbackData: `order_copies_nop:${orderId}` },
      { text: '+', callbackData: orderCopiesIncPayload(orderId) },
    ])
  }
  if (options.withRemove) {
    rows.push([{ text: BTN_REMOVE_FILE, callbackData: batchRemovePayload(orderId) }])
  }
  return rows
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
    || payload.startsWith('order_refund_request:')
    || payload.startsWith('batch_refund_request:')
}

export function orderRefundRequestPayload(orderId: string): string {
  return `order_refund_request:${orderId}`
}

export function batchRefundRequestPayload(batchId: string): string {
  return `batch_refund_request:${batchId}`
}

export function parseOrderRefundRequestPayload(payload: string): string | null {
  if (!payload.startsWith('order_refund_request:')) return null
  return payload.slice('order_refund_request:'.length) || null
}

export function parseBatchRefundRequestPayload(payload: string): string | null {
  if (!payload.startsWith('batch_refund_request:')) return null
  return payload.slice('batch_refund_request:'.length) || null
}

export function partnerRefundPayload(orderId: string): string {
  return `partner_refund:${orderId}`
}

export function partnerRetryPrintPayload(orderId: string): string {
  return `partner_retry_print:${orderId}`
}

export function partnerManualPrintPayload(orderId: string): string {
  return `partner_manual_print:${orderId}`
}

export function printFailureClientKeyboard(
  failedOrders: Array<{ id: string, fileName: string }>,
  batchId?: string | null,
): InlineKeyboardButton[][] {
  const rows = printRetryKeyboard(failedOrders)
  if (batchId) {
    rows.push([{ text: BTN_REQUEST_REFUND, callbackData: batchRefundRequestPayload(batchId) }])
  } else if (failedOrders.length === 1) {
    rows.push([{ text: BTN_REQUEST_REFUND, callbackData: orderRefundRequestPayload(failedOrders[0]!.id) }])
  }
  return rows
}

export function partnerPrintFailedKeyboard(
  orderId: string,
  options?: { showRefund?: boolean },
): InlineKeyboardButton[][] {
  const rows: InlineKeyboardButton[][] = [
    [{ text: BTN_RETRY_PRINT, callbackData: partnerRetryPrintPayload(orderId) }],
    [{ text: BTN_PARTNER_MANUAL_PRINT, callbackData: partnerManualPrintPayload(orderId) }],
  ]
  if (options?.showRefund) {
    rows.push([{ text: BTN_PARTNER_REFUND, callbackData: partnerRefundPayload(orderId) }])
  }
  return rows
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
