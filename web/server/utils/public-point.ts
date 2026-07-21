import type { Prisma } from '@prisma/client'
import { haversineKm, formatDistanceKm } from './geo'
import { getPointScheduleStatus } from './point-schedule'
import { isPointAgentOnline } from './points'

export type PublicPointRecord = {
  id: string
  slug: string
  name: string
  displayCode: string | null
  citySlug: string
  address: string | null
  lat: number | null
  lng: number | null
  pricePerPageKopeks: number
  timezone: string
  openingHours: Prisma.JsonValue | null
  acceptsOnlineOrders: boolean
  pickupInstructions: string | null
  estimatedReadyMinutes: string | null
  entryPhotoUrl: string | null
  lastSeenAt: Date | null
  isActive: boolean
  visibleInList: boolean
}

export type PublicPointPayload = {
  slug: string
  name: string
  displayCode: string | null
  citySlug: string
  address: string | null
  lat: number | null
  lng: number | null
  pricePerPageKopeks: number
  agentOnline: boolean
  acceptsOnlineOrders: boolean
  isOpenNow: boolean
  statusText: string
  closingSoon: boolean
  canSelect: boolean
  markerStatus: 'open' | 'closed' | 'closing' | 'offline'
  pickupInstructions: string | null
  estimatedReadyMinutes: string | null
  entryPhotoUrl: string | null
  distanceKm: number | null
  distanceText: string | null
}

function markerStatusForPoint(
  point: PublicPointRecord,
  schedule: ReturnType<typeof getPointScheduleStatus>,
): PublicPointPayload['markerStatus'] {
  if (!isPointAgentOnline(point)) {
    return 'offline'
  }
  if (!schedule.isOpenNow) {
    return 'closed'
  }
  if (schedule.closingSoon) {
    return 'closing'
  }
  return 'open'
}

export function toPublicPointPayload(
  point: PublicPointRecord,
  options?: { userLat?: number | null, userLng?: number | null },
): PublicPointPayload {
  const schedule = getPointScheduleStatus(point)
  const agentOnline = isPointAgentOnline(point)
  const canSelect = point.isActive
    && point.visibleInList
    && point.acceptsOnlineOrders
    && agentOnline
    && schedule.isOpenNow

  let distanceKm: number | null = null
  let distanceText: string | null = null
  if (
    options?.userLat != null
    && options?.userLng != null
    && point.lat != null
    && point.lng != null
  ) {
    distanceKm = haversineKm(
      { lat: options.userLat, lng: options.userLng },
      { lat: point.lat, lng: point.lng },
    )
    distanceText = formatDistanceKm(distanceKm)
  }

  return {
    slug: point.slug,
    name: point.name,
    displayCode: point.displayCode,
    citySlug: point.citySlug,
    address: point.address,
    lat: point.lat,
    lng: point.lng,
    pricePerPageKopeks: point.pricePerPageKopeks,
    agentOnline,
    acceptsOnlineOrders: point.acceptsOnlineOrders,
    isOpenNow: schedule.isOpenNow,
    statusText: schedule.statusText,
    closingSoon: schedule.closingSoon,
    canSelect,
    markerStatus: markerStatusForPoint(point, schedule),
    pickupInstructions: point.pickupInstructions,
    estimatedReadyMinutes: point.estimatedReadyMinutes,
    entryPhotoUrl: point.entryPhotoUrl,
    distanceKm,
    distanceText,
  }
}
