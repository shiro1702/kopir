export const MSG_START =
  'Привет! Отправь PDF или Word-документ (.doc, .docx) для печати.\n\n'
  + 'После загрузки файла мы сообщим номер заказа и инструкцию по оплате.'

export const MSG_UNSUPPORTED_FILE =
  'Пока принимаем только PDF и Word (.doc, .docx). Отправьте файл в одном из этих форматов.'

/** @deprecated Use MSG_UNSUPPORTED_FILE */
export const MSG_PDF_ONLY = MSG_UNSUPPORTED_FILE

export const MSG_CALCULATING =
  'Считаем страницы на принтере… Это может занять до 20 секунд.'

export const MSG_CALCULATION_FAILED =
  'Не удалось обработать файл. Проверьте, что документ не повреждён, и попробуйте снова или отправьте PDF.'

export function formatOrderReceived(fileName: string, shortId: string): string {
  return (
    `📄 Файл получен: ${fileName}\n`
    + `Заказ #${shortId}\n`
    + `Статус: ожидает оплаты\n\n`
    + 'Переведите сумму на карту и дождитесь подтверждения администратора.\n'
    + 'В тестовом режиме оплата подтверждается вручную.'
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
    + 'Ожидаем оплату. После перевода сотрудник подтвердит заказ.'
  )
}

export function formatCalculationFailed(fileName: string, errorMessage?: string | null): string {
  const detail = errorMessage?.trim()
  if (detail) {
    return `${MSG_CALCULATION_FAILED}\n\nПричина: ${detail}`
  }
  return MSG_CALCULATION_FAILED
}

export function formatPaymentConfirmed(shortId: string): string {
  return `✅ Оплата подтверждена!\nЗаказ #${shortId}\nДокумент отправлен на печать.`
}

export function formatPrintComplete(shortId: string): string {
  return `✅ Готово!\nЗаказ #${shortId}\nЗаберите документ у принтера.`
}
