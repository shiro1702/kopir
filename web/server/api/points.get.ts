import { listActivePoints, getActivePointBySlug } from '../utils/points'
import { DEFAULT_CITY_SLUG, parseCitySlug } from '../utils/point-admin-fields'
import { toPublicPointPayload } from '../utils/public-point'

function parseOptionalFloat(raw: string | undefined): number | null {
  if (!raw) {
    return null
  }
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const citySlug = query.city ? parseCitySlug(query.city) : undefined
  const userLat = parseOptionalFloat(query.userLat as string | undefined)
  const userLng = parseOptionalFloat(query.userLng as string | undefined)

  const points = await listActivePoints(citySlug ? { citySlug } : undefined)

  return {
    citySlug: citySlug ?? DEFAULT_CITY_SLUG,
    points: points.map((point) => toPublicPointPayload(point, { userLat, userLng })),
  }
})
