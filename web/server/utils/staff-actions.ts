import { confirmBatchPayment } from './batch'
import { confirmManualPrint, confirmOrderPayment, retryOrderPrint, startOrderPrint } from './order-staff-actions'

function isAlreadyConfirmed(result: { alreadyConfirmed?: boolean }): boolean {
  return result.alreadyConfirmed === true
}

export function isStaffPaymentConfirmPayload(data: string): boolean {
  return data.startsWith('staff_pay:') || data.startsWith('staff_batch_confirm:')
}

export async function handleStaffCallbackPayload(data: string): Promise<string> {
  if (data.startsWith('staff_batch_confirm:')) {
    const batchId = data.slice('staff_batch_confirm:'.length)
    const result = await confirmBatchPayment(batchId)
    if (isAlreadyConfirmed(result)) {
      return 'Уже подтверждено'
    }
    return '✅ Оплата принята, печать запущена'
  }

  if (data.startsWith('staff_pay:')) {
    const orderId = data.slice('staff_pay:'.length)
    const result = await confirmOrderPayment(orderId)
    if (isAlreadyConfirmed(result)) {
      return 'Уже подтверждено'
    }
    return '✅ Оплата принята, печать запущена'
  }

  if (data.startsWith('staff_print:')) {
    const orderId = data.slice('staff_print:'.length)
    await startOrderPrint(orderId)
    return 'Печать запущена'
  }

  if (data.startsWith('staff_retry_print:')) {
    const orderId = data.slice('staff_retry_print:'.length)
    const result = await retryOrderPrint(orderId)
    if (result.alreadyQueued) {
      return 'Печать уже в очереди'
    }
    return '🔄 Повторная печать запущена'
  }

  if (data.startsWith('staff_manual_print:')) {
    const orderId = data.slice('staff_manual_print:'.length)
    await confirmManualPrint(orderId)
    return 'Печать отмечена как выполненная'
  }

  throw createError({
    statusCode: 400,
    data: { error: 'Unknown staff action', code: 'UNKNOWN_ACTION' },
  })
}
