import { confirmBatchPayment } from './batch'
import { confirmManualPrint, confirmOrderPayment, startOrderPrint } from './order-staff-actions'

export async function handleStaffCallbackPayload(data: string): Promise<string> {
  if (data.startsWith('staff_batch_confirm:')) {
    const batchId = data.slice('staff_batch_confirm:'.length)
    await confirmBatchPayment(batchId)
    return 'Оплата пачки подтверждена, печать запущена'
  }

  if (data.startsWith('staff_pay:')) {
    const orderId = data.slice('staff_pay:'.length)
    await confirmOrderPayment(orderId)
    return 'Оплата принята, печать запущена'
  }

  if (data.startsWith('staff_print:')) {
    const orderId = data.slice('staff_print:'.length)
    await startOrderPrint(orderId)
    return 'Печать запущена'
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
