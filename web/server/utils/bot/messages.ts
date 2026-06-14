import { isTerminalPaymentMode } from '../payment-mode'

export const MSG_START =
  'Привет! Отправь PDF или Word-документ (.doc, .docx) для печати.\n\n'
  + 'После загрузки мы сообщим стоимость и дальнейшие шаги по оплате.'

export const MSG_UNSUPPORTED_FILE =
  'Пока принимаем только PDF и Word (.doc, .docx). Отправьте файл в одном из этих форматов.'

/** @deprecated Use MSG_UNSUPPORTED_FILE */
export const MSG_PDF_ONLY = MSG_UNSUPPORTED_FILE

export const MSG_CALCULATING =
  'Считаем страницы на принтере… Это может занять до 20 секунд.'

export const MSG_CALCULATION_FAILED =
  'Не удалось обработать файл. Проверьте, что документ не повреждён, и попробуйте снова или отправьте PDF.'

function clientPaymentHint(): string {
  if (isTerminalPaymentMode()) {
    return (
      'Оплатите на терминале копицентра.\n'
      + 'Сотрудник получит уведомление — после оплаты подтвердит её и запустит печать.'
    )
  }
  return 'Оплата в боте скоро будет доступна. Пока обратитесь к сотруднику копицентра.'
}

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

export function formatPrintStarted(shortId: string): string {
  return (
    `🖨 Заказ #${shortId} отправлен на печать.\n`
    + 'Заберите документ у принтера, когда будет готово.'
  )
}

/** @deprecated Use formatPrintStarted */
export function formatPaymentConfirmed(shortId: string): string {
  return formatPrintStarted(shortId)
}

export function formatPrintComplete(shortId: string): string {
  return `✅ Готово!\nЗаказ #${shortId}\nЗаберите документ у принтера.`
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

export function paymentModeLabel(mode: 'terminal' | 'online'): string {
  return mode === 'terminal' ? 'Терминал (ручное подтверждение)' : 'Онлайн (скоро)'
}
