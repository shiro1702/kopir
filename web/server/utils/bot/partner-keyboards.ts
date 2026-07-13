import { PaymentMethod } from '@prisma/client'
import type { Point } from '@prisma/client'
import type { InlineKeyboardButton } from './types'
import type { PartnerOrdersPeriod } from '../partner-stats'

/** Payment methods partners may enable/disable in the bot. Manual methods are admin-only. */
export const PARTNER_MANAGEABLE_PAYMENT_METHODS: PaymentMethod[] = [
  PaymentMethod.TBANK_SBP,
  PaymentMethod.TBANK_ONLINE,
]

export const PARTNER_RESTRICTED_PAYMENT_METHODS: PaymentMethod[] = [
  PaymentMethod.SBP_TRANSFER,
  PaymentMethod.ON_SITE,
]

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
    [{ text: '◀️ Назад', callbackData: `partner_point:${pointId}` }],
  ]
}

function partnerPaymentToggleRows(point: Point): InlineKeyboardButton[][] {
  const labels: Record<PaymentMethod, string> = {
    [PaymentMethod.TBANK_SBP]: 'СБП',
    [PaymentMethod.TBANK_ONLINE]: 'Карта',
    [PaymentMethod.SBP_TRANSFER]: 'Перевод',
    [PaymentMethod.ON_SITE]: 'На месте',
  }
  const methods = PARTNER_MANAGEABLE_PAYMENT_METHODS.map((id) => ({
    id,
    label: labels[id],
  }))

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

export function isPartnerPrintFailureAction(data: string): boolean {
  return data.startsWith('partner_retry_print:')
    || data.startsWith('partner_manual_print:')
    || data.startsWith('partner_refund')
}
