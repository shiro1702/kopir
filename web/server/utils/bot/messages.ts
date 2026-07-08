import { isTerminalPaymentMode } from '../payment-mode'

export const BTN_FINALIZE_BATCH = '✅ Оплатить'
export const BTN_CANCEL_BATCH = '❌ Отменить всё'
export const BTN_REMOVE_FILE = '🗑 Удалить этот файл'
export const BTN_REMOVE_CONFIRM = 'Да, удалить'
export const BTN_REMOVE_CANCEL = 'Нет'
export const BTN_RETRY_PRINT = '🔄 Попробовать снова'
export const BTN_SELECT_POINT = '📋 Выбрать точку'
export const BTN_CHANGE_POINT = '📍 Изменить точку'
export const BTN_SELECT_OTHER_POINT = '📍 Выбрать другую точку'
export const BTN_POINT_LIST = '📋 Выбрать из списка'
export const BTN_POINT_BACK = '⬅️ Назад'

export const MSG_POINT_NOT_FOUND = 'Точка не найдена. Проверьте код или выберите из списка.'
export const MSG_POINT_OFFLINE =
  '❌ К сожалению, этот принтер сейчас временно не работает.\n\n'
  + 'Попробуйте позже или выберите другую точку.'
export const MSG_POINT_OFFLINE_NO_FILES =
  '❌ Принтер сейчас не подключён к системе. '
  + 'Дождитесь подключения или выберите другую точку.'
export const MSG_POINT_OFFLINE_PAYMENT =
  '❌ Принтер сейчас не подключён к системе. Оплата недоступна — '
  + 'дождитесь подключения или выберите другую точку.'
export const MSG_POINT_SELECTED = (label: string) => `📍 Выбрана точка: ${label}`

export const MSG_FILE_RECEIVING = '📥 Принимаю'
export const MSG_BATCH_FINALIZING = '⏳ Готовим к оплате…'
export const MSG_BATCH_FILE_ALREADY_REMOVED = 'Этот файл уже удалён.'
export const MSG_BATCH_BATCH_CANCELLED_ACTION = 'Сброшено.'
export const MSG_BATCH_EMPTY_AFTER_REMOVE =
  'Файлов не осталось. Отправьте документ, когда будете готовы.'
export const MSG_BATCH_CANNOT_REMOVE_CALCULATING =
  'Этот файл ещё считается на принтере. Подождите несколько секунд.'
export const MSG_BATCH_CONTROLS = 'Ваши файлы'

export const MSG_START =
  'Привет! Отправляйте файлы по одному (PDF или Word).\n\n'
  + 'Word-файлы сначала считаются на принтере — это может занять до 20 секунд.\n'
  + 'Можно отправить до 5 документов за раз — оплата одна.\n'
  + 'Когда всё готово, появится кнопка «Оплатить».'

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
  'Достигнут лимит — не больше 5 файлов за раз. '
  + 'Дождитесь подсчёта страниц или нажмите «Отменить всё».'

export const MSG_BATCH_STILL_CALCULATING =
  'Подождите: идёт подсчёт страниц. '
  + 'Когда все файлы будут готовы, появится кнопка «Оплатить».'

export const MSG_BATCH_CALCULATION_FAILED =
  'Не удалось обработать один или несколько файлов. '
  + 'Нажмите «Удалить этот файл» под проблемным документом и отправьте его снова.'

export const MSG_BATCH_CANCELLED =
  'Сброшено. Отправьте файлы заново, когда будете готовы.'

function clientPaymentHint(): string {
  if (isTerminalPaymentMode()) {
    return (
      'Оплатите на терминале копицентра.\n'
      + 'Сотрудник получит уведомление — после оплаты подтвердит её и запустит печать.'
    )
  }
  return 'Оплата в боте скоро будет доступна. Пока обратитесь к сотруднику копицентра.'
}

export function formatFileReceiving(fileName: string): string {
  return `${MSG_FILE_RECEIVING} «${fileName}»…`
}

export function formatFileCalculating(fileName: string, fileIndex: number, maxFiles: number): string {
  return (
    `⏳ Считаем страницы «${fileName}»…\n`
    + 'Это может занять до 20 секунд.\n\n'
    + `Файлов: ${fileIndex} из ${maxFiles}.`
  )
}

export function formatBatchFileCalculating(
  fileName: string,
  fileIndex: number,
  maxFiles: number,
): string {
  return (
    `${MSG_CALCULATING}\n\n`
    + `Файл: ${fileName}\n\n`
    + `Файлов: ${fileIndex} из ${maxFiles}.\n`
    + 'Можно отправить ещё файлы.'
  )
}

export interface BatchFileReadyOptions {
  pointLabel?: string | null
  totalAmountKopeks?: number
  pointOffline?: boolean
}

export function formatBatchFileReady(
  fileName: string,
  fileIndex: number,
  maxFiles: number,
  pageCount: number,
  canFinalize: boolean,
  options?: BatchFileReadyOptions,
): string {
  const hasPoint = Boolean(options?.pointLabel)
  const lines = [
    `📎 Файл готов: ${fileName}`,
    `Страниц: ${pageCount}`,
    '',
    `Файлов: ${fileIndex} из ${maxFiles}.`,
  ]

  if (hasPoint) {
    lines.push('', `📍 Точка: ${options!.pointLabel}`)
    if (options?.totalAmountKopeks !== undefined && options.totalAmountKopeks > 0) {
      lines.push(`💰 Стоимость: ${Math.round(options.totalAmountKopeks / 100)} ₽`)
    }
    if (options?.pointOffline) {
      lines.push('', MSG_POINT_OFFLINE_PAYMENT)
    } else {
      lines.push('', canFinalize
        ? 'Нажмите «Оплатить», когда будете готовы.'
        : 'Можно отправить ещё файлы.')
    }
  } else {
    lines.push(
      '',
      '⚠️ Чтобы рассчитать стоимость и отправить на печать, выберите точку:',
    )
  }

  return lines.join('\n')
}

/** @deprecated Use formatBatchFileCalculating or formatBatchFileReady */
export function formatBatchFileAdded(
  fileName: string,
  fileIndex: number,
  maxFiles: number,
  isCalculating: boolean,
): string {
  if (isCalculating) {
    return formatBatchFileCalculating(fileName, fileIndex, maxFiles)
  }
  return formatBatchFileReady(fileName, fileIndex, maxFiles, 1, true)
}

export function formatBatchRemoveConfirm(fileName: string): string {
  return `Удалить «${fileName}»? Остальные файлы сохранятся.`
}

export function formatFileRemovedInline(fileName: string): string {
  return `🗑 «${fileName}» удалён.`
}

export function formatBatchFileRemovedToast(remainingCount: number, maxFiles: number): string {
  return `Удалено. Файлов: ${remainingCount} из ${maxFiles}.`
}

export function formatBatchCalculationFailedForFile(
  fileName: string,
  errorMessage?: string | null,
): string {
  const detail = errorMessage?.trim()
  const base = (
    `❌ Не удалось обработать «${fileName}».\n`
    + 'Нажмите «Удалить этот файл» и отправьте документ снова.'
  )
  return detail ? `${base}\n\nПричина: ${detail}` : base
}

export function formatBatchSummary(
  fileNames: string[],
  totalPages: number,
  totalAmountKopeks: number,
  pointLabel?: string | null,
): string {
  const amountRub = Math.round(totalAmountKopeks / 100)
  const filesList = fileNames.map((name, i) => `${i + 1}. ${name}`).join('\n')
  const pointLine = pointLabel ? `📍 Точка: ${pointLabel}\n\n` : ''
  return (
    `📄 ${fileNames.length} ${pluralFiles(fileNames.length)} к оплате\n\n`
    + `${filesList}\n\n`
    + pointLine
    + `Страниц: ${totalPages}\n`
    + `Итого: ${amountRub} ₽`
  )
}

export function formatPointListHeader(page: number, totalPages: number): string {
  if (totalPages <= 1) {
    return '📋 Выберите точку печати:'
  }
  return `📋 Выберите точку печати (стр. ${page + 1}/${totalPages}):`
}

export function formatPointChangeMenu(): string {
  return '📍 Изменить точку печати:\n\nИли отправьте номер точки, если вы уже у принтера.'
}

export function formatStartWithPoint(pointLabel: string): string {
  return (
    `${MSG_POINT_SELECTED(pointLabel)}\n\n`
    + 'Отправляйте файлы по одному (PDF или Word).\n'
    + 'Можно отправить до 5 документов за раз — оплата одна.'
  )
}

export function formatPointOfflineAtStart(pointLabel: string): string {
  return (
    `📍 Вы выбрали точку: ${pointLabel}\n\n`
    + MSG_POINT_OFFLINE
  )
}

function pluralFiles(count: number): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return 'файл'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'файла'
  return 'файлов'
}

export function formatBatchPaymentConfirmed(
  batchShortId: string,
  fileCount: number,
  agentOffline = false,
  onlinePayment = false,
): string {
  const afterPay = onlinePayment
    ? 'Печать запустится автоматически.'
    : 'Сотрудник запустит печать.'
  const base = (
    `✅ Оплата принята!\n`
    + `#${batchShortId} · ${fileCount} ${pluralFiles(fileCount)}\n`
    + afterPay
  )
  return agentOffline ? `${base}\n\n${MSG_AGENT_OFFLINE_AFTER_PAYMENT}` : base
}

export function formatBatchPrintStarted(batchShortId: string, current: number, total: number): string {
  return (
    `🖨 Печать #${batchShortId} началась (${current}/${total}).\n`
    + 'Заберите документы у принтера, когда будут готовы.'
  )
}

export function formatBatchPrintComplete(_batchShortId: string, _fileCount: number): string {
  return '✅ Готово!\nЗаберите распечатку у принтера.'
}

export function formatBatchPrintPartialFailure(
  batchShortId: string,
  failedFiles: Array<{ fileName: string }>,
  totalFiles: number,
): string {
  const failedList = failedFiles.map((f) => `• ${f.fileName}`).join('\n')
  const retryHint = failedFiles.length === 1
    ? 'Нажмите «Попробовать снова» — печать запустится автоматически.'
    : 'Нажмите «Попробовать снова» под нужным файлом.'
  return (
    `⚠️ #${batchShortId}: печать завершена с ошибками.\n\n`
    + `Не удалось напечатать:\n${failedList}\n\n`
    + `Успешно: ${totalFiles - failedFiles.length} из ${totalFiles}.\n`
    + `${retryHint} Если не поможет — обратитесь к сотруднику копицентра.`
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
    + `Стоимость: ${amountRub} ₽`
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

export function formatPrintComplete(_shortId: string): string {
  return '✅ Готово!\nЗаберите распечатку у принтера.'
}

export function formatPrintFailed(shortId: string, fileName: string): string {
  return (
    `⚠️ Не удалось напечатать заказ #${shortId}.\n`
    + `📄 ${fileName}\n\n`
    + 'Нажмите «Попробовать снова» — печать запустится автоматически. '
    + 'Если не поможет — обратитесь к сотруднику копицентра.'
  )
}

export function formatPrintAutoRetry(fileName: string): string {
  return (
    `🔄 Не удалось напечатать «${fileName}».\n`
    + 'Пробуем ещё раз автоматически…'
  )
}

export function formatPrintRetryStarted(fileName: string): string {
  return (
    `🔄 Повторная печать «${fileName}» запущена.\n`
    + 'Заберите документ у принтера, когда будет готово.'
  )
}

export function formatBatchPrintAutoRetry(batchShortId: string, fileName: string): string {
  return (
    `🔄 #${batchShortId}: не удалось напечатать «${fileName}».\n`
    + 'Пробуем ещё раз автоматически…'
  )
}

export function formatBatchPrintRetryStarted(batchShortId: string, fileName: string): string {
  return (
    `🔄 #${batchShortId}: повторная печать «${fileName}» запущена.\n`
    + 'Заберите документ у принтера, когда будет готово.'
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
    + '\n\nАвтоповтор не помог. Распечатайте вручную, нажмите «Попробовать снова» или «Печать готова».'
  )
}

export function formatStaffPrintAutoRetry(
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
    + '\n\nПовторяем печать автоматически…'
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



export function formatPaymentMethodChoice(
  amountKopeks: number,
  shortId: string,
  options?: { hasOnlineMethods?: boolean },
): string {
  const amountRub = Math.round(amountKopeks / 100)
  const base = `💳 ${amountRub} ₽ · #${shortId}\nВыберите способ:`
  if (!options?.hasOnlineMethods) {
    return base
  }
  return `${base}\n\nПосле оплаты придёт подтверждение. Не дождались — «Проверить».`
}

export function formatTransferInstructions(
  amountKopeks: number,
  shortId: string,
  phone: string,
  bankLabel: string | null,
): string {
  const amountRub = Math.round(amountKopeks / 100)
  const bankLine = bankLabel ? ` (${bankLabel})` : ''
  return (
    `💳 ${amountRub} ₽ · #${shortId}\n\n`
    + `Перевод на ${phone}${bankLine}\n`
    + `Комментарий: ${shortId}\n\n`
    + 'После перевода — «Я оплатил».'
  )
}

export function formatOnSiteInstructions(amountKopeks: number, shortId: string): string {
  const amountRub = Math.round(amountKopeks / 100)
  return (
    `💳 ${amountRub} ₽ · #${shortId}\n\n`
    + 'Оплатите у сотрудника на стойке.\n'
    + `Номер заказа: ${shortId}`
  )
}

export function formatAwaitingStaffConfirm(shortId: string): string {
  return (
    `⏳ Ждём подтверждения оплаты по заказу #${shortId}.\n`
    + 'Обычно это занимает 1–2 минуты.'
  )
}

export function formatOnlineSbpAfterOpen(amountKopeks: number, shortId: string): string {
  const amountRub = (amountKopeks / 100).toFixed(2)
  return (
    `💳 ${amountRub} ₽ · #${shortId}\n\n`
    + 'Подтвердите оплату в банке.\n'
    + 'Когда оплатите — нажмите «Проверить».'
  )
}

export function formatOnlineCardAfterOpen(amountKopeks: number, shortId: string): string {
  const amountRub = (amountKopeks / 100).toFixed(2)
  return (
    `💳 ${amountRub} ₽ · #${shortId}\n\n`
    + 'Завершите оплату на странице банка.\n'
    + 'Когда оплатите — нажмите «Проверить».'
  )
}

export function formatOnlineSbpWithLink(amountKopeks: number, shortId: string): string {
  const amountRub = (amountKopeks / 100).toFixed(2)
  return (
    `💳 ${amountRub} ₽ · #${shortId}\n\n`
    + 'Нажмите «Открыть оплату» и подтвердите в банке.\n'
    + 'Когда оплатите — нажмите «Проверить».'
  )
}

export function formatOnlineCardWithLink(amountKopeks: number, shortId: string): string {
  const amountRub = (amountKopeks / 100).toFixed(2)
  return (
    `💳 ${amountRub} ₽ · #${shortId}\n\n`
    + 'Нажмите «Открыть оплату» и завершите оплату на странице банка.\n'
    + 'Когда оплатите — нажмите «Проверить».'
  )
}

/** @deprecated use formatOnlineSbpAfterOpen or formatOnlineSbpWithLink */
export function formatOnlineSbpInstructions(amountKopeks: number, shortId: string): string {
  return formatOnlineSbpWithLink(amountKopeks, shortId)
}

/** @deprecated use formatOnlineCardAfterOpen or formatOnlineCardWithLink */
export function formatOnlineCardInstructions(amountKopeks: number, shortId: string): string {
  return formatOnlineCardWithLink(amountKopeks, shortId)
}

/** @deprecated use formatOnlineSbpInstructions */
export function formatOnlinePaymentInstructions(
  amountKopeks: number,
  shortId: string,
  _qrUrl: string,
): string {
  return formatOnlineSbpInstructions(amountKopeks, shortId)
}

export function formatOnlinePaymentNotStarted(shortId: string): string {
  return `⏳ #${shortId} — сначала оплатите через «СБП» или «карту», затем «Проверить».`
}

export function formatOnlinePaymentPending(shortId: string): string {
  return `⏳ #${shortId} — оплата ещё не поступила. Проверьте банк или нажмите «Проверить».`
}

export function formatOnlinePaymentConfirmed(shortId: string): string {
  return `✅ #${shortId} — оплата получена. Запускаем печать.`
}

export function formatPaymentReceiptLink(shortId: string, receiptUrl: string): string {
  return `🧾 Электронный чек по оплате #${shortId}:\n${receiptUrl}`
}

function staffUserLabel(user: { username?: string | null, firstName?: string | null }): string {
  return user.username ? `@${user.username}` : user.firstName ?? 'клиент'
}

function staffAmountText(amountKopeks: number): string {
  return amountKopeks > 0 ? `${Math.round(amountKopeks / 100)} ₽` : 'уточните у клиента'
}

export function formatStaffTransferAwaitingConfirm(order: StaffOrderInfo & {
  transferPhoneMasked: string
}): string {
  const shortId = order.id.slice(-6)
  return (
    '🔔 Проверьте приложение банка\n\n'
    + `Заказ #${shortId} | ${staffAmountText(order.amountKopeks)}\n`
    + `📄 ${order.fileName}\n`
    + `Страниц: ${order.pageCount}\n`
    + `Клиент: ${staffUserLabel(order.user)}\n`
    + `Точка: ${order.point.name}\n`
    + 'Способ: перевод СБП\n\n'
    + `Ожидаем поступление на ${order.transferPhoneMasked}\n`
    + `Комментарий к переводу: ${shortId}`
  )
}

export function formatStaffOnSiteAwaitingPayment(order: StaffOrderInfo): string {
  const shortId = order.id.slice(-6)
  return (
    '🆕 Клиент идёт на стойку\n\n'
    + `Заказ #${shortId} | ${staffAmountText(order.amountKopeks)}\n`
    + `📄 ${order.fileName}\n`
    + `Страниц: ${order.pageCount}\n`
    + `Клиент: ${staffUserLabel(order.user)}\n`
    + `Точка: ${order.point.name}\n`
    + 'Способ: оплата на месте\n\n'
    + 'Примите оплату и нажмите «Оплата получена».'
  )
}

export function formatStaffBatchTransferAwaitingConfirm(batch: {
  id: string
  totalPages: number
  totalAmountKopeks: number
  transferPhoneMasked: string
  orders: Array<{ fileName: string, batchIndex: number | null }>
  user: { username?: string | null, firstName?: string | null }
  point: { name: string }
}): string {
  const shortId = batch.id.slice(-6)
  const filesList = batch.orders.map((o) => `${o.batchIndex}. ${o.fileName}`).join('\n')
  return (
    '🔔 Проверьте приложение банка\n\n'
    + `Пачка #${shortId} | ${staffAmountText(batch.totalAmountKopeks)}\n`
    + `Файлов: ${batch.orders.length}\n`
    + `${filesList}\n\n`
    + `Страниц: ${batch.totalPages}\n`
    + `Клиент: ${staffUserLabel(batch.user)}\n`
    + `Точка: ${batch.point.name}\n`
    + 'Способ: перевод СБП\n\n'
    + `Ожидаем поступление на ${batch.transferPhoneMasked}\n`
    + `Комментарий к переводу: ${shortId}`
  )
}

export function formatStaffBatchOnSiteAwaitingPayment(batch: {
  id: string
  totalPages: number
  totalAmountKopeks: number
  orders: Array<{ fileName: string, batchIndex: number | null }>
  user: { username?: string | null, firstName?: string | null }
  point: { name: string }
}): string {
  const shortId = batch.id.slice(-6)
  const filesList = batch.orders.map((o) => `${o.batchIndex}. ${o.fileName}`).join('\n')
  return (
    '🆕 Клиент идёт на стойку\n\n'
    + `Пачка #${shortId} | ${staffAmountText(batch.totalAmountKopeks)}\n`
    + `Файлов: ${batch.orders.length}\n`
    + `${filesList}\n\n`
    + `Страниц: ${batch.totalPages}\n`
    + `Клиент: ${staffUserLabel(batch.user)}\n`
    + `Точка: ${batch.point.name}\n`
    + 'Способ: оплата на месте\n\n'
    + 'Примите оплату и подтвердите пачку целиком.'
  )
}

export function formatStaffOrderPaymentConfirmed(
  shortId: string,
  amountKopeks: number,
  fileName: string,
): string {
  const amountText = staffAmountText(amountKopeks)
  return (
    `✅ Оплата по заказу #${shortId} принята (${amountText})\n`
    + `📄 ${fileName}\n`
    + '🖨 Печать запущена.'
  )
}

export function formatStaffBatchPaymentConfirmed(
  shortId: string,
  fileCount: number,
  totalAmountKopeks: number,
): string {
  const amountText = staffAmountText(totalAmountKopeks)
  return (
    `✅ Оплата пачки #${shortId} принята (${fileCount} файлов, ${amountText})\n`
    + '🖨 Печать запущена.'
  )
}

export function paymentModeLabel(mode: 'terminal' | 'online'): string {
  return mode === 'terminal' ? 'Терминал (ручное подтверждение)' : 'Онлайн (скоро)'
}
