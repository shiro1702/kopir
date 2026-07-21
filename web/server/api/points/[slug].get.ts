import { getActivePointBySlug } from '../../utils/points'
import { toPublicPointPayload } from '../../utils/public-point'

function parseOptionalFloat(raw: string | undefined): number | null {
  if (!raw) {
    return null
  }
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({
      statusCode: 400,
      data: { error: 'slug is required', code: 'SLUG_REQUIRED' },
    })
  }

  const query = getQuery(event)
  const userLat = parseOptionalFloat(query.userLat as string | undefined)
  const userLng = parseOptionalFloat(query.userLng as string | undefined)

  const point = await getActivePointBySlug(slug)
  if (!point) {
    throw createError({
      statusCode: 404,
      data: { error: 'Point not found', code: 'POINT_NOT_FOUND' },
    })
  }

  return {
    point: toPublicPointPayload(point, { userLat, userLng }),
  }
})
