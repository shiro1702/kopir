import { listActivePoints, pointAgentStatusPayload } from '../utils/points'

export default defineEventHandler(async () => {
  const points = await listActivePoints()
  return {
    points: points.map((point) => {
      const status = pointAgentStatusPayload(point)
      return {
        slug: point.slug,
        name: point.name,
        displayCode: point.displayCode,
        pricePerPageKopeks: point.pricePerPageKopeks,
        agentOnline: status.agentOnline,
      }
    }),
  }
})
