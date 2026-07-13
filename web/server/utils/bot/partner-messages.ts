import type { PaymentMethod } from '@prisma/client'
import type { PartnerOrdersPeriod } from '../partner-stats'
import { formatRequisitesForDisplay, type PartnerRequisites } from '../partner-requisites'

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  SBP_TRANSFER: 'Перевод СБП',
  TBANK_SBP: 'СБП (Т-Банк)',
  TBANK_ONLINE: 'Карта (Т-Банк)',
  ON_SITE: 'На месте',
}

const PERIOD_LABELS: Record<PartnerOrdersPeriod, string> = {
  day: 'Сегодня',
  week: 'Неделя',
  month: 'Месяц',
}

export function formatRubles(kopeks: number): string {
  return `${(kopeks / 100).toFixed(kopeks % 100 === 0 ? 0 : 2)} ₽`
}

export function formatPartnerWelcome(pointName: string, offerUrl?: string | null): string {
  const offerLine = offerUrl
    ? `\n\nПродолжая работу в кабинете, вы принимаете условия оферты:\n${offerUrl}`
    : ''
  return `✅ Точка «${pointName}» привязана к вашему кабинету партнёра.${offerLine}`
}

export function formatPartnerNotBound(): string {
  return 'Кабинет партнёра не привязан.\n\nПопросите администратора Kopir ссылку для привязки или отправьте:\n/partner bind_xxx'
}

export function formatPartnerMainMenu(pointCount: number): string {
  if (pointCount === 1) {
    return '📋 Кабинет партнёра'
  }
  return `📋 Кабинет партнёра (${pointCount} точек)`
}

export function formatPartnerPointPicker(): string {
  return 'Выберите точку:'
}

export function formatPartnerStatus(
  pointName: string,
  agentOnline: boolean,
  lastSeenAt: Date | null,
): string {
  const status = agentOnline ? '🟢 Агент в сети' : '🔴 Агент офлайн'
  const seen = lastSeenAt
    ? `\nПоследний сигнал: ${lastSeenAt.toLocaleString('ru-RU')}`
    : '\nАгент ещё не подключался'
  return `📍 ${pointName}\n\n${status}${seen}`
}

export function formatPartnerOrders(
  pointName: string,
  period: PartnerOrdersPeriod,
  pages: number,
  amountKopeks: number,
): string {
  return `📊 Заказы — ${pointName}\n${PERIOD_LABELS[period]}\n\nСтраниц: ${pages}\nСумма: ${formatRubles(amountKopeks)}`
}

export function formatPartnerSettings(point: {
  name: string
  pricePerPageKopeks: number
  paymentMethodsEnabled: PaymentMethod[]
}): string {
  const methods = point.paymentMethodsEnabled
    .map((m) => PAYMENT_LABELS[m])
    .join(', ') || '—'

  return `⚙️ Настройки — ${point.name}\n\n`
    + `Цена за стр.: ${formatRubles(point.pricePerPageKopeks)}\n`
    + `Способы оплаты: ${methods}\n\n`
    + 'Можно включать и выключать только СБП и оплату картой.\n'
    + 'Перевод по номеру и оплата на месте настраиваются администратором.'
}

export function formatPartnerManualPaymentAdminOnly(): string {
  return 'Перевод по номеру телефона и оплата на месте настраиваются администратором Kopir.\n\n'
    + 'В кабинете партнёра доступны только онлайн-способы: СБП и карта.'
}

export function formatPartnerBalance(
  balanceKopeks: number,
  entries: Array<{ type: string, amountKopeks: number, createdAt: Date, batchId?: string | null }>,
  requisitesIncomplete = false,
): string {
  let text = `💰 Баланс к выплате: ${formatRubles(balanceKopeks)}\n\n`
    + 'Выплаты раз в неделю по реквизитам.\n'

  if (requisitesIncomplete) {
    text += '\n⚠️ Заполните реквизиты для выплат в разделе «Реквизиты».\n'
  }

  if (entries.length === 0) {
    text += '\nОпераций пока нет.'
    return text
  }

  text += '\nПоследние операции:\n'
  for (const entry of entries) {
    const sign = entry.type === 'CREDIT' ? '+' : '−'
    const date = entry.createdAt.toLocaleDateString('ru-RU')
    const batchSuffix = entry.batchId ? ` · #${entry.batchId.slice(-6)}` : ''
    text += `${sign}${formatRubles(entry.amountKopeks)} · ${date}${batchSuffix}\n`
  }
  return text.trimEnd()
}

export function formatPartnerPriceUpdated(priceKopeks: number): string {
  return `✅ Цена обновлена: ${formatRubles(priceKopeks)} за стр.`
}

export function formatPartnerPaymentMethodsUpdated(): string {
  return '✅ Способы оплаты обновлены'
}

export function formatPartnerPhoneUpdated(phone: string): string {
  return `✅ Телефон для перевода: ${phone}`
}

export function formatPartnerRequisites(req: PartnerRequisites | null): string {
  const current = formatRequisitesForDisplay(req)
  return `🏦 Реквизиты для выплат\n\n${current}\n\n`
    + 'Чтобы указать или изменить, отправьте:\n'
    + '/partner req Название | ИНН | Расчётный счёт | БИК\n\n'
    + 'Например:\n'
    + '/partner req ИП Иванов И.И. | 772345678901 | 40802810100000012345 | 044525225'
}

export function formatPartnerRequisitesUpdated(req: PartnerRequisites): string {
  return `✅ Реквизиты сохранены\n\n${formatRequisitesForDisplay(req)}`
}

export function formatPartnerClientLinks(
  pointName: string,
  links: {
    telegramDeepLink: string | null
    telegramPayload: string
    maxDeepLink: string | null
    maxPayload: string
    goLink: string | null
  },
): string {
  const lines = [`🔗 QR и ссылки — ${pointName}`, '']
  if (links.telegramDeepLink) {
    lines.push('Telegram:', links.telegramDeepLink, `Payload: ${links.telegramPayload}`, '')
  } else {
    lines.push('Telegram:', `/start ${links.telegramPayload}`, '')
  }
  if (links.maxDeepLink) {
    lines.push('MAX:', links.maxDeepLink, `Payload: ${links.maxPayload}`, '')
  } else {
    lines.push('MAX:', `/start ${links.maxPayload}`, '')
  }
  if (links.goLink) {
    lines.push('Универсально (скоро):', links.goLink)
  }
  lines.push('', 'Плакат A4: /admin/points → «Ссылка точки» → «Скачать плакат»')
  return lines.join('\n').trimEnd()
}

export function formatPartnerPrintFailed(
  order: {
    id: string
    fileName: string
    batchId?: string | null
    point: { name: string }
  },
  errorMessage?: string | null,
): string {
  const shortId = order.id.slice(-6)
  const batchLine = order.batchId ? `\nПачка #${order.batchId.slice(-6)}` : ''
  const reason = errorMessage?.trim()
  return (
    `⚠️ Не удалось напечатать автоматически #${shortId}${batchLine}\n`
    + `📄 ${order.fileName}\n`
    + `Точка: ${order.point.name}`
    + (reason ? `\n\nПричина: ${reason}` : '')
    + '\n\nФайл ниже — скачайте и распечатайте вручную. '
    + 'Когда документ готов — нажмите «Ручная печать», клиент получит уведомление. '
    + 'Или нажмите «Попробовать снова» для автопечати.'
  )
}

export function formatPartnerPhoneHint(pointId: string): string {
  return `Отправьте команду:\n/partner phone ${pointId} +79XXXXXXXXX`
}

export { PAYMENT_LABELS }
