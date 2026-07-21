import { getPointScheduleStatus } from './point-schedule'
import { isPointAgentOnline } from './points'

export type PointOrderEligibility = {
  canAccept: boolean
  reason: string | null
  code: string | null
}

export function getPointOrderEligibility(point: {
  isActive: boolean
  visibleInList: boolean
  acceptsOnlineOrders: boolean
  lastSeenAt: Date | null
  openingHours?: unknown
  timezone?: string | null
}): PointOrderEligibility {
  if (!point.isActive) {
    return { canAccept: false, reason: 'Точка временно недоступна.', code: 'POINT_INACTIVE' }
  }
  if (!point.visibleInList) {
    return { canAccept: false, reason: 'Точка временно недоступна.', code: 'POINT_HIDDEN' }
  }
  if (!point.acceptsOnlineOrders) {
    return {
      canAccept: false,
      reason: 'Онлайн-заказы на эту точку временно недоступны.',
      code: 'POINT_ONLINE_ORDERS_DISABLED',
    }
  }
  if (!isPointAgentOnline(point)) {
    return {
      canAccept: false,
      reason: 'Принтер сейчас офлайн. Выберите другую точку.',
      code: 'POINT_AGENT_OFFLINE',
    }
  }
  const schedule = getPointScheduleStatus(point)
  if (!schedule.isOpenNow) {
    return {
      canAccept: false,
      reason: `${schedule.statusText}. Выберите другую точку.`,
      code: 'POINT_CLOSED',
    }
  }
  return { canAccept: true, reason: null, code: null }
}

export function canAcceptOrder(point: Parameters<typeof getPointOrderEligibility>[0]): boolean {
  return getPointOrderEligibility(point).canAccept
}

export function assertPointAcceptsOrders(point: Parameters<typeof getPointOrderEligibility>[0]): void {
  const eligibility = getPointOrderEligibility(point)
  if (!eligibility.canAccept) {
    throw createError({
      statusCode: 400,
      data: { error: eligibility.reason ?? 'Точка недоступна', code: eligibility.code ?? 'POINT_UNAVAILABLE' },
    })
  }
}
