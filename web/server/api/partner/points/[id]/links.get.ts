import type { H3Event } from 'h3'
import type { MessengerPlatform } from '@prisma/client'
import { assertPartnerOwnsPoint } from '../../../../utils/partner-auth'
import { buildPointClientLinksPayloadForPoint } from '../../../../utils/point-links'
import { prisma } from '../../../../utils/prisma'

function parsePartnerAuth(event: H3Event): { platform: MessengerPlatform, userId: bigint } {
  const platform = String(getHeader(event, 'x-partner-platform') ?? '').trim()
  const userIdRaw = String(getHeader(event, 'x-partner-user-id') ?? '').trim()

  if (platform !== 'telegram' && platform !== 'max') {
    throw createError({
      statusCode: 401,
      data: { error: 'Invalid partner platform', code: 'UNAUTHORIZED' },
    })
  }

  if (!/^\d+$/.test(userIdRaw)) {
    throw createError({
      statusCode: 401,
      data: { error: 'Invalid partner user id', code: 'UNAUTHORIZED' },
    })
  }

  return {
    platform,
    userId: BigInt(userIdRaw),
  }
}

export default defineEventHandler(async (event) => {
  const { platform, userId } = parsePartnerAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      data: { error: 'Point id is required', code: 'ID_REQUIRED' },
    })
  }

  try {
    await assertPartnerOwnsPoint(platform, userId, id)
  } catch {
    throw createError({
      statusCode: 403,
      data: { error: 'Нет доступа', code: 'FORBIDDEN' },
    })
  }

  const point = await prisma.point.findUnique({ where: { id } })
  if (!point) {
    throw createError({
      statusCode: 404,
      data: { error: 'Point not found', code: 'NOT_FOUND' },
    })
  }

  return buildPointClientLinksPayloadForPoint(point)
})
