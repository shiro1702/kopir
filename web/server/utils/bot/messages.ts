import { isTerminalPaymentMode } from '../payment-mode'

export const BTN_FINALIZE_BATCH = '✅ Завершить и оплатить'
export const BTN_CANCEL_BATCH = '❌ Отменить пачку'

export const MSG_START =
  'Привет! Отправляйте файлы по одному (PDF или Word).\n\n'
  + 'Когда всё готово — нажмите «Завершить и оплатить».\n'
  + 'Можно добавить до 5 файлов в одну пачку.'

export const MSG_UNSUPPORTED_FILE =
  'Пока принимаем только PDF и Word (.doc, .docx). Отправьте файл в одном из этих форматов.'

export const MSG_CALCULATING =
  'Считаем страницы на принтере… Это может занять до 20 секунд.'

export const MSG_CALCULATION_FAILED =
  'Не удалось обработать файл. Проверьте, что документ не повреждён, и попробуйте снова или отправьте PDF.'

export const MSG_UPLOAD_FAILED =
  'Не удалось сохранить файл. Попробуйте отправить документ ещё раз через минуту.'

export const MSG_AGENT_OFFLINE_AFTER_PAYMENT =
  '⚠️ Сейчас принтер не подключён к системе. '
  + 'Печать начнётся автоматически, когда компьютер копицентра снова будет в сети. '
  + 'Если прошло несколько минут — обратитесь к сотруднику.'

export const MSG_BATCH_LIMIT =
  'Достигнут лимит файлов в пачке. Нажмите «Завершить и оплатить» или «Отменить пачку».'

export const MSG_BATCH_CANCELLED =
  'Пачка отменена. Отправьте файлы заново, когда будете готовы.'

function clientPaymentHint(): string {
  if (isTerminalPaymentMode()) {
    return (
      'Оплатите на терминале копицентра.\n'
      + 'Сотрудник получит уведомление — после оплаты подтвердит её и запустит печать.'
    )
  }
  return 'Оплата в боте скоро будет доступна. Пока обратитесь к сотруднику копицентра.'
}

export function formatBatchFileAdded(
  fileName: string,
  fileIndex: number,
  maxFiles: number,
  isCalculating: boolean,
): string {
  const status = isCalculating
    ? MSG_CALCULATING
    : `Файл ${fileIndex}/${maxFiles}: ${fileName}`
  return (
    `📎 ${status}\n\n`
    + `В пачке: ${fileIndex} из ${maxFiles}.\n`
    + 'Добавьте ещё файлы или нажмите «Завершить и оплатить».'
  )
}

export function formatBatchSummary(
  fileNames: string[],
  totalPages: number,
  totalAmountKopeks: number,
): string {
  const amountRub = Math.round(totalAmountKopeks / 100)
  const filesList = fileNames.map((name, i) => `${i + 1}. ${name}`).join('\n')
  return (
    `📦 Пачка собрана (${fileNames.length} файлов)\n\n`
    + `${filesList}\n\n`
    + `Страниц: ${totalPages}\n`
    + `Итого: ${amountRub} ₽\n\n`
    + clientPaymentHint()
  )
}

export function formatBatchPaymentConfirmed(
  batchShortId: string,
  fileCount: number,
  agentOffline = false,
): string {
  const base = (
    `✅ Оплата принята!\n`
    + `Пачка #${batchShortId} (${fileCount} файлов)\n`
    + 'Сотрудник запустит печать.'
  )
  return agentOffline ? `${base}\n\n${MSG_AGENT_OFFLINE_AFTER_PAYMENT}` : base
}

export function formatBatchPrintStarted(batchShortId: string, current: number, total: number): string {
  return (
    `🖨 Печать пачки #${batchShortId} началась (${current}/${total}).\n`
    + 'Заберите документы у принтера, когда будут готовы.'
  )
}

export function formatBatchPrintComplete(batchShortId: string, fileCount: number): string {
  return (
    `✅ Готово!\n`
    + `Пачка #${batchShortId} (${fileCount} файлов)\n`
    + 'Заберите документы у принтера.'
  )
}

export function formatBatchPrintPartialFailure(
  batchShortId: string,
  failedFileNames: string[],
  totalFiles: number,
): string {
  const failedList = failedFileNames.map((n) => `• ${n}`).join('\n')
  return (
    `⚠️ Пачка #${batchShortId}: печать завершена с ошибками.\n\n`
    + `Не удалось напечатать:\n${failedList}\n\n`
    + `Успешно: ${totalFiles - failedFileNames.length} из ${totalFiles}.\n`
    + 'Обратитесь к сотруднику копицентра.'
  )
}

/** @deprecated Single-order flow; batch uses formatBatchFileAdded */
export function formatOrderReceived(fileName: string, shortId: string): string {
  return (
    `📄 Файл получен: ${fileName}\n`
    + `Заказ #${shortId}\n\n`
    + clientPaymentHint()
  )
}

export function formatCalculating(fileName: string, shortId: string): string {
  return (
    `📄 Файл получен: ${fileName}\n`
    + `Заказ #${shortId}\n\n`
    + MSG_CALCULATING
  )
}

export function formatQuote(fileName: string, pageCount: number, amountKopeks: number): string {
  const amountRub = Math.round(amountKopeks / 100)
  return (
    `📄 ${fileName}\n`
    + `Страниц: ${pageCount}\n`
    + `Стоимость: ${amountRub} ₽\n\n`
    + clientPaymentHint()
  )
}

export function formatCalculationFailed(fileName: string, errorMessage?: string | null): string {
  const detail = errorMessage?.trim()
  if (detail) {
    return `${MSG_CALCULATION_FAILED}\n\nПричина: ${detail}`
  }
  return MSG_CALCULATION_FAILED
}

export function formatPaymentReceivedByStaff(shortId: string): string {
  return (
    `✅ Оплата принята!\n`
    + `Заказ #${shortId}\n`
    + 'Сотрудник запустит печать.'
  )
}

export function formatPrintStarted(shortId: string, agentOffline = false): string {
  const base = (
    `🖨 Заказ #${shortId} отправлен на печать.\n`
    + 'Заберите документ у принтера, когда будет готово.'
  )
  return agentOffline ? `${base}\n\n${MSG_AGENT_OFFLINE_AFTER_PAYMENT}` : base
}

/** @deprecated Use formatPrintStarted */
export function formatPaymentConfirmed(shortId: string): string {
  return formatPrintStarted(shortId)
}

export function formatPrintComplete(shortId: string): string {
  return `✅ Готово!\nЗаказ #${shortId}\nЗаберите документ у принтера.`
}

export function formatPrintFailed(shortId: string, fileName: string): string {
  return (
    `⚠️ Не удалось напечатать заказ #${shortId}.\n`
    + `📄 ${fileName}\n\n`
    + 'Обратитесь к сотруднику копицентра — он поможет распечатать документ.'
  )
}

interface StaffOrderInfo {
  id: string
  fileName: string
  pageCount: number
  amountKopeks: number
  user: {
    username?: string | null
    firstName?: string | null
  }
  point: {
    name: string
  }
}

export function formatStaffOrderAwaitingPayment(order: StaffOrderInfo): string {
  const shortId = order.id.slice(-6)
  const amountText = order.amountKopeks > 0
    ? `${Math.round(order.amountKopeks / 100)} ₽`
    : 'уточните у клиента'
  const userLabel = order.user.username
    ? `@${order.user.username}`
    : order.user.firstName ?? 'клиент'

  return (
    `🆕 Новый заказ #${shortId}\n`
    + `📄 ${order.fileName}\n`
    + `Страниц: ${order.pageCount} | ${amountText}\n`
    + `Клиент: ${userLabel}\n`
    + `Точка: ${order.point.name}\n\n`
    + 'Примите оплату на терминале, затем:\n'
    + '1️⃣ «Оплата получена»\n'
    + '2️⃣ «Печать»'
  )
}

export function formatStaffPrintFailed(
  order: StaffOrderInfo & { batchId?: string | null },
  errorMessage?: string | null,
): string {
  const shortId = order.id.slice(-6)
  const batchLine = order.batchId ? `\nПачка #${order.batchId.slice(-6)}` : ''
  const reason = errorMessage?.trim()
  return (
    `⚠️ Ошибка автопечати #${shortId}${batchLine}\n`
    + `📄 ${order.fileName}\n`
    + `Точка: ${order.point.name}`
    + (reason ? `\n\nПричина: ${reason}` : '')
    + '\n\nОплата уже принята — распечатайте файл вручную и нажмите «Печать готова».'
  )
}

export function formatStaffBatchAwaitingPayment(batch: {
  id: string
  totalPages: number
  totalAmountKopeks: number
  orders: Array<{ fileName: string, batchIndex: number | null }>
  user: { username?: string | null, firstName?: string | null }
  point: { name: string }
}): string {
  const shortId = batch.id.slice(-6)
  const amountText = batch.totalAmountKopeks > 0
    ? `${Math.round(batch.totalAmountKopeks / 100)} ₽`
    : 'уточните у клиента'
  const userLabel = batch.user.username
    ? `@${batch.user.username}`
    : batch.user.firstName ?? 'клиент'
  const filesList = batch.orders
    .map((o) => `${o.batchIndex}. ${o.fileName}`)
    .join('\n')

  return (
    `🆕 Новая пачка #${shortId}\n`
    + `Файлов: ${batch.orders.length}\n`
    + `${filesList}\n\n`
    + `Страниц: ${batch.totalPages} | ${amountText}\n`
    + `Клиент: ${userLabel}\n`
    + `Точка: ${batch.point.name}\n\n`
    + 'Примите оплату на терминале и подтвердите пачку целиком.'
  )
}

export function paymentModeLabel(mode: 'terminal' | 'online'): string {
  return mode === 'terminal' ? 'Терминал (ручное подтверждение)' : 'Онлайн (скоро)'
}
