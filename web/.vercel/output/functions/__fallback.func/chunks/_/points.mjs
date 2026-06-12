import { c as createError } from '../nitro/nitro.mjs';
import { p as prisma } from './prisma.mjs';

async function resolvePointBySlug(slug) {
  const point = await prisma.point.findUnique({ where: { slug } });
  if (!point || !point.isActive) {
    throw createError({
      statusCode: 404,
      data: { error: `Point not found: ${slug}`, code: "POINT_NOT_FOUND" }
    });
  }
  return point;
}

export { resolvePointBySlug as r };
//# sourceMappingURL=points.mjs.map
