import { assertAdminAuth } from '../../../../utils/admin-auth'
import { generateBindToken, getTelegramBindDeepLinkAsync } from '../../../../utils/bind-tokens'
import { prisma } from '../../../../utils/prisma'

export default defineEventHandler(async (event) => {
  assertAdminAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      data: { error: 'Point id is required', code: 'ID_REQUIRED' },
    })
  }

  const point = await prisma.point.findUnique({ where: { id } })
  if (!point) {
    throw createError({
      statusCode: 404,
      data: { error: 'Point not found', code: 'NOT_FOUND' },
    })
  }

  const { token, expiresAt } = await generateBindToken(point.id, 'staff', 24)
  const telegramDeepLink = await getTelegramBindDeepLinkAsync(token)
  const bindCommand = `/bind ${token}`

  return {
    token,
    expiresAt: expiresAt.toISOString(),
    deepLink: telegramDeepLink,
    telegramDeepLink,
    bindCommand,
    maxBindCommand: bindCommand,
  }
})
