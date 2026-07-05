import { listActivePoints } from '../utils/points'

export default defineEventHandler(async () => {
  const points = await listActivePoints()
  return {
    points: points.map((point) => ({
      slug: point.slug,
      name: point.name,
      displayCode: point.displayCode,
    })),
  }
})
