import { prisma } from './prisma'

export async function resolvePointBySlug(slug: string) {
  const point = await prisma.point.findUnique({ where: { slug } })
  if (!point || !point.isActive) {
    throw createError({
      statusCode: 404,
      data: { error: `Point not found: ${slug}`, code: 'POINT_NOT_FOUND' },
    })
  }
  return point
}
