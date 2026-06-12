export const MSG_START =
  'Привет! Отправь PDF-документ для печати.\n\n'
  + 'После загрузки файла мы сообщим номер заказа и инструкцию по оплате.'

export const MSG_PDF_ONLY =
  'Пока принимаем только PDF. Отправьте файл с расширением .pdf'

export function formatOrderReceived(fileName: string, shortId: string): string {
  return (
    `📄 Файл получен: ${fileName}\n`
    + `Заказ #${shortId}\n`
    + `Статус: ожидает оплаты\n\n`
    + 'Переведите сумму на карту и дождитесь подтверждения администратора.\n'
    + 'В тестовом режиме оплата подтверждается вручную.'
  )
}

export function formatPaymentConfirmed(shortId: string): string {
  return `✅ Оплата подтверждена!\nЗаказ #${shortId}\nДокумент отправлен на печать.`
}
