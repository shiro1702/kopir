import {
  buildOpeningHoursFromAdmin,
  openingHoursToAdminFields,
  type PointOpeningHours,
} from './point-schedule'
import { parseOptionalCoords } from './geo'

export const DEFAULT_CITY_SLUG = 'ulan-ude'

export function parseCitySlug(raw: unknown): string {
  const value = String(raw ?? DEFAULT_CITY_SLUG).trim().toLowerCase()
  if (!value) {
    return DEFAULT_CITY_SLUG
  }
  return value
}

export function parsePointContentFields(body: Record<string, unknown>) {
  const citySlug = body.citySlug !== undefined ? parseCitySlug(body.citySlug) : undefined
  const address = body.address !== undefined
    ? (body.address ? String(body.address).trim() : null)
    : undefined
  const coords = body.lat !== undefined || body.lng !== undefined
    ? parseOptionalCoords(body.lat, body.lng)
    : undefined
  const timezone = body.timezone !== undefined
    ? (String(body.timezone).trim() || 'Asia/Irkutsk')
    : undefined
  const openingHours = body.openingHoursWeekdays !== undefined
    || body.openingHoursSaturday !== undefined
    || body.openingHoursSunday !== undefined
    ? buildOpeningHoursFromAdmin(body)
    : undefined
  const acceptsOnlineOrders = body.acceptsOnlineOrders !== undefined
    ? Boolean(body.acceptsOnlineOrders)
    : undefined
  const pickupInstructions = body.pickupInstructions !== undefined
    ? (body.pickupInstructions ? String(body.pickupInstructions).trim() : null)
    : undefined
  const estimatedReadyMinutes = body.estimatedReadyMinutes !== undefined
    ? (body.estimatedReadyMinutes ? String(body.estimatedReadyMinutes).trim() : null)
    : undefined
  const entryPhotoUrl = body.entryPhotoUrl !== undefined
    ? (body.entryPhotoUrl ? String(body.entryPhotoUrl).trim() : null)
    : undefined

  return {
    citySlug,
    address,
    lat: coords === undefined ? undefined : coords?.lat ?? null,
    lng: coords === undefined ? undefined : coords?.lng ?? null,
    timezone,
    openingHours,
    acceptsOnlineOrders,
    pickupInstructions,
    estimatedReadyMinutes,
    entryPhotoUrl,
  }
}

export function serializePointContentForAdmin(point: {
  citySlug: string
  address: string | null
  lat: number | null
  lng: number | null
  timezone: string
  openingHours: unknown
  acceptsOnlineOrders: boolean
  pickupInstructions: string | null
  estimatedReadyMinutes: string | null
  entryPhotoUrl: string | null
}) {
  return {
    citySlug: point.citySlug,
    address: point.address,
    lat: point.lat,
    lng: point.lng,
    timezone: point.timezone,
    acceptsOnlineOrders: point.acceptsOnlineOrders,
    pickupInstructions: point.pickupInstructions,
    estimatedReadyMinutes: point.estimatedReadyMinutes,
    entryPhotoUrl: point.entryPhotoUrl,
    ...openingHoursToAdminFields(point.openingHours),
  }
}

export function openingHoursOrNull(hours: PointOpeningHours | null | undefined) {
  if (!hours) {
    return null
  }
  return hours
}
