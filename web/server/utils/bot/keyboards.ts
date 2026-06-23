import {
  BTN_CANCEL_BATCH,
  BTN_FINALIZE_BATCH,
  BTN_REMOVE_CANCEL,
  BTN_REMOVE_CONFIRM,
  BTN_REMOVE_FILE,
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
