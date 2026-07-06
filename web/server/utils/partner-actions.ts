import { PaymentMethod } from '@prisma/client'
import type { MessengerPlatform } from '@prisma/client'
import {
  assertPartnerOwnsPoint,
  getPartnerByMessenger,
  getPartnerPoints,
  resolvePointIdFromPartnerPayload,
} from './partner-auth'
import { getPartnerBalanceSummary } from './partner-balance'
import { getPartnerOrdersStats, type PartnerOrdersPeriod } from './partner-stats'
import { updatePointSettings } from './point-settings'
import { isPointAgentOnline } from './points'
import { buildPointClientLinksForSlug } from './point-links'
import { prisma } from './prisma'
import * as messages from './bot/partner-messages'
import {
  partnerBackMenuKeyboard,
  partnerMainMenuKeyboard,
  partnerOrdersPeriodKeyboard,
  partnerPointMenuKeyboard,
  partnerSettingsKeyboard,
} from './bot/partner-keyboards'

export type PartnerScreen = {
  text: string
  keyboard: import('./bot/types').InlineKeyboardButton[][]
}

async function getPartnerScreen(
  platform: MessengerPlatform,
  userId: bigint,
): Promise<PartnerScreen | null> {
  const partner = await getPartnerByMessenger(platform, userId)
  if (!partner) {
    return null
  }
  const points = await getPartnerPoints(partner.id)
  if (points.length === 0) {
    return {
      text: messages.formatPartnerNotBound(),
      keyboard: [],
    }
  }
  return {
    text: messages.formatPartnerMainMenu(points.length),
    keyboard: partnerMainMenuKeyboard(points),
  }
}

export async function buildPartnerMenuScreen(
  platform: MessengerPlatform,
  userId: bigint,
): Promise<PartnerScreen> {
  const screen = await getPartnerScreen(platform, userId)
  return screen ?? { text: messages.formatPartnerNotBound(), keyboard: [] }
}

export async function handlePartnerCallbackPayload(
  platform: MessengerPlatform,
  userId: bigint,
  data: string,
): Promise<PartnerScreen> {
  if (data === 'partner_menu') {
    return buildPartnerMenuScreen(platform, userId)
  }

  if (data === 'partner_balance') {
    const partner = await getPartnerByMessenger(platform, userId)
    if (!partner) {
      throw new Error('Нет доступа')
    }
    const { balanceKopeks, recentEntries } = await getPartnerBalanceSummary(partner.id)
    return {
      text: messages.formatPartnerBalance(balanceKopeks, recentEntries),
      keyboard: partnerBackMenuKeyboard(),
    }
  }

  const pointId = resolvePointIdFromPartnerPayload(data)
  if (!pointId) {
    throw new Error('Неизвестная команда')
  }

  await assertPartnerOwnsPoint(platform, userId, pointId)

  const point = await prisma.point.findUnique({ where: { id: pointId } })
  if (!point) {
    throw new Error('Точка не найдена')
  }

  if (data === `partner_point:${pointId}`) {
    return {
      text: `📍 ${point.name}`,
      keyboard: partnerPointMenuKeyboard(pointId),
    }
  }

  if (data.startsWith('partner_status:')) {
    return {
      text: messages.formatPartnerStatus(
        point.name,
        isPointAgentOnline(point),
        point.lastSeenAt,
      ),
      keyboard: [[{ text: '◀️ Назад', callbackData: `partner_point:${pointId}` }]],
    }
  }

  if (data.startsWith('partner_orders:')) {
    const period = (data.split(':')[2] ?? 'day') as PartnerOrdersPeriod
    const stats = await getPartnerOrdersStats(pointId, period)
    return {
      text: messages.formatPartnerOrders(point.name, period, stats.pages, stats.amountKopeks),
      keyboard: partnerOrdersPeriodKeyboard(pointId, period),
    }
  }

  if (data === `partner_settings:${pointId}`) {
    return {
      text: messages.formatPartnerSettings(point),
      keyboard: partnerSettingsKeyboard(point),
    }
  }

  if (data.startsWith('partner_price:')) {
    const kopeks = Number(data.split(':')[2])
    if (!Number.isFinite(kopeks) || kopeks <= 0) {
      throw new Error('Некорректная цена')
    }
    const updated = await updatePointSettings(pointId, { pricePerPageKopeks: kopeks })
    return {
      text: `${messages.formatPartnerPriceUpdated(updated.pricePerPageKopeks)}\n\n${messages.formatPartnerSettings(updated)}`,
      keyboard: partnerSettingsKeyboard(updated),
    }
  }

  if (data.startsWith('partner_price_adj:')) {
    const delta = Number(data.split(':')[2])
    if (!Number.isFinite(delta)) {
      throw new Error('Некорректная цена')
    }
    const newPrice = point.pricePerPageKopeks + delta
    if (newPrice <= 0) {
      throw new Error('Цена должна быть больше 0')
    }
    const updated = await updatePointSettings(pointId, { pricePerPageKopeks: newPrice })
    return {
      text: `${messages.formatPartnerPriceUpdated(updated.pricePerPageKopeks)}\n\n${messages.formatPartnerSettings(updated)}`,
      keyboard: partnerSettingsKeyboard(updated),
    }
  }

  if (data.startsWith('partner_toggle_pay:')) {
    const method = data.split(':')[2] as PaymentMethod
    if (!Object.values(PaymentMethod).includes(method)) {
      throw new Error('Некорректный способ оплаты')
    }
    const enabled = [...point.paymentMethodsEnabled]
    const idx = enabled.indexOf(method)
    if (idx >= 0) {
      if (enabled.length <= 1) {
        throw new Error('Должен остаться хотя бы один способ оплаты')
      }
      enabled.splice(idx, 1)
    } else {
      enabled.push(method)
    }
    const updated = await updatePointSettings(pointId, { paymentMethodsEnabled: enabled })
    return {
      text: `${messages.formatPartnerPaymentMethodsUpdated()}\n\n${messages.formatPartnerSettings(updated)}`,
      keyboard: partnerSettingsKeyboard(updated),
    }
  }

  if (data.startsWith('partner_phone_hint:')) {
    return {
      text: messages.formatPartnerPhoneHint(pointId),
      keyboard: [[{ text: '◀️ Назад', callbackData: `partner_settings:${pointId}` }]],
    }
  }

  if (data.startsWith('partner_links:')) {
    const links = await buildPointClientLinksForSlug(point.slug)
    return {
      text: messages.formatPartnerClientLinks(point.name, links),
      keyboard: [[{ text: '◀️ Назад', callbackData: `partner_point:${pointId}` }]],
    }
  }

  throw new Error('Неизвестная команда')
}

export async function handlePartnerPhoneCommand(
  platform: MessengerPlatform,
  userId: bigint,
  pointId: string,
  phone: string,
): Promise<string> {
  await assertPartnerOwnsPoint(platform, userId, pointId)
  const normalized = phone.trim()
  if (!normalized || normalized.length < 10) {
    throw new Error('Укажите корректный номер телефона')
  }
  await updatePointSettings(pointId, { transferPhone: normalized })
  return messages.formatPartnerPhoneUpdated(normalized)
}

export async function assertPartnerForPayload(
  platform: MessengerPlatform,
  userId: bigint,
  payload: string,
): Promise<void> {
  if (payload === 'partner_menu' || payload === 'partner_balance') {
    const partner = await getPartnerByMessenger(platform, userId)
    if (!partner) {
      throw new Error('Нет доступа')
    }
    return
  }

  const pointId = resolvePointIdFromPartnerPayload(payload)
  if (!pointId) {
    throw new Error('Неизвестная команда')
  }
  await assertPartnerOwnsPoint(platform, userId, pointId)
}
