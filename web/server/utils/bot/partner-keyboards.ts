import { PaymentMethod } from '@prisma/client'
import type { Point } from '@prisma/client'
import type { InlineKeyboardButton } from './types'
import type { PartnerOrdersPeriod } from '../partner-stats'

export function partnerMainMenuKeyboard(points: Point[]): InlineKeyboardButton[][] {
  if (points.length === 1) {
    const pointId = points[0].id
    return [
      [{ text: '📡 Статус', callbackData: `partner_status:${pointId}` }],
      [{ text: '📊 Заказы', callbackData: `partner_orders:${pointId}:day` }],
      [{ text: '⚙️ Настройки', callbackData: `partner_settings:${pointId}` }],
      [{ text: '🔗 QR и ссылки', callbackData: `partner_links:${pointId}` }],
      [{ text: '🏦 Реквизиты', callbackData: 'partner_requisites' }],
      [{ text: '💰 Баланс', callbackData: 'partner_balance' }],
    ]
  }

  const rows: InlineKeyboardButton[][] = points.map((p) => ([
    { text: `📍 ${p.name}`, callbackData: `partner_point:${p.id}` },
  ]))
  rows.push([{ text: '🏦 Реквизиты', callbackData: 'partner_requisites' }])
  rows.push([{ text: '💰 Баланс', callbackData: 'partner_balance' }])
  return rows
}

export function partnerPointMenuKeyboard(pointId: string): InlineKeyboardButton[][] {
  return [
    [{ text: '📡 Статус', callbackData: `partner_status:${pointId}` }],
    [{ text: '📊 Заказы', callbackData: `partner_orders:${pointId}:day` }],
    [{ text: '⚙️ Настройки', callbackData: `partner_settings:${pointId}` }],
    [{ text: '🔗 QR и ссылки', callbackData: `partner_links:${pointId}` }],
    [{ text: '◀️ К точкам', callbackData: 'partner_menu' }],
  ]
}

export function partnerOrdersPeriodKeyboard(
  pointId: string,
  active: PartnerOrdersPeriod,
): InlineKeyboardButton[][] {
  const periods: PartnerOrdersPeriod[] = ['day', 'week', 'month']
  const labels: Record<PartnerOrdersPeriod, string> = {
    day: 'Сегодня',
    week: 'Неделя',
    month: 'Месяц',
  }

  return [
    periods.map((p) => ({
      text: p === active ? `• ${labels[p]}` : labels[p],
      callbackData: `partner_orders:${pointId}:${p}`,
    })),
    [{ text: '◀️ Назад', callbackData: `partner_point:${pointId}` }],
  ]
}

export function partnerSettingsKeyboard(point: Point): InlineKeyboardButton[][] {
  const pointId = point.id

  return [
    [
      { text: '8 ₽', callbackData: `partner_price:${pointId}:800` },
      { text: '10 ₽', callbackData: `partner_price:${pointId}:1000` },
      { text: '12 ₽', callbackData: `partner_price:${pointId}:1200` },
      { text: '15 ₽', callbackData: `partner_price:${pointId}:1500` },
    ],
    [
      { text: '−1 ₽', callbackData: `partner_price_adj:${pointId}:-100` },
      { text: '＋1 ₽', callbackData: `partner_price_adj:${pointId}:100` },
    ],
    ...partnerPaymentToggleRows(point),
    [{ text: '📱 Телефон СБП', callbackData: `partner_phone_hint:${pointId}` }],
    [{ text: '◀️ Назад', callbackData: `partner_point:${pointId}` }],
  ]
}

function partnerPaymentToggleRows(point: Point): InlineKeyboardButton[][] {
  const methods: Array<{ id: PaymentMethod, label: string }> = [
    { id: PaymentMethod.SBP_TRANSFER, label: 'Перевод' },
    { id: PaymentMethod.TBANK_SBP, label: 'СБП' },
    { id: PaymentMethod.TBANK_ONLINE, label: 'Карта' },
    { id: PaymentMethod.ON_SITE, label: 'На месте' },
  ]

  return [
    methods.map((m) => ({
      text: point.paymentMethodsEnabled.includes(m.id) ? `✅ ${m.label}` : m.label,
      callbackData: `partner_toggle_pay:${point.id}:${m.id}`,
    })),
  ]
}

export function partnerBackMenuKeyboard(): InlineKeyboardButton[][] {
  return [[{ text: '◀️ Меню', callbackData: 'partner_menu' }]]
}

export function isPartnerCallbackPayload(data: string): boolean {
  return data.startsWith('partner_')
}
