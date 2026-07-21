export interface GeoCoords {
  lat: number
  lng: number
}

const EARTH_RADIUS_KM = 6371

export function haversineKm(a: GeoCoords, b: GeoCoords): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function formatDistanceKm(km: number): string {
  if (!Number.isFinite(km) || km < 0) {
    return ''
  }
  if (km < 1) {
    const meters = Math.round(km * 1000)
    return `≈ ${meters} м`
  }
  const rounded = km < 10 ? km.toFixed(1).replace('.0', '') : String(Math.round(km))
  return `≈ ${rounded} км`
}

export function parseOptionalCoords(latRaw: unknown, lngRaw: unknown): { lat: number, lng: number } | null {
  if (latRaw === undefined || latRaw === null || latRaw === '') {
    return null
  }
  if (lngRaw === undefined || lngRaw === null || lngRaw === '') {
    return null
  }
  const lat = Number(latRaw)
  const lng = Number(lngRaw)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw createError({
      statusCode: 400,
      data: { error: 'lat and lng must be valid numbers', code: 'INVALID_COORDS' },
    })
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw createError({
      statusCode: 400,
      data: { error: 'lat/lng out of range', code: 'INVALID_COORDS' },
    })
  }
  return { lat, lng }
}
