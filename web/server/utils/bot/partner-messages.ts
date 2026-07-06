import type { PaymentMethod } from '@prisma/client'
import type { PartnerOrdersPeriod } from '../partner-stats'

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

export function formatPartnerWelcome(pointName: string): string {
  return `✅ Точка «${pointName}» привязана к вашему кабинету партнёра.`
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
  transferPhone: string | null
  transferBankLabel: string | null
}): string {
  const methods = point.paymentMethodsEnabled
    .map((m) => PAYMENT_LABELS[m])
    .join(', ') || '—'
  const phone = point.transferPhone ?? 'не указан'
  const bank = point.transferBankLabel ? ` (${point.transferBankLabel})` : ''

  return `⚙️ Настройки — ${point.name}\n\n`
    + `Цена за стр.: ${formatRubles(point.pricePerPageKopeks)}\n`
    + `Способы оплаты: ${methods}\n`
    + `Телефон для перевода: ${phone}${bank}`
}

export function formatPartnerBalance(
  balanceKopeks: number,
  entries: Array<{ type: string, amountKopeks: number, createdAt: Date }>,
): string {
  let text = `💰 Баланс\n\nК выплате: ${formatRubles(balanceKopeks)}\n`
    + 'Выплаты раз в неделю по реквизитам.\n'

  if (entries.length === 0) {
    text += '\nОпераций пока нет.'
    return text
  }

  text += '\nПоследние операции:\n'
  for (const entry of entries) {
    const sign = entry.type === 'CREDIT' ? '+' : '−'
    const date = entry.createdAt.toLocaleDateString('ru-RU')
    text += `${date}: ${sign}${formatRubles(entry.amountKopeks)}\n`
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

export function formatPartnerPhoneHint(pointId: string): string {
  return `Отправьте команду:\n/partner phone ${pointId} +79XXXXXXXXX`
}

export { PAYMENT_LABELS }
