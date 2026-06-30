import { consumeBindToken } from '../../utils/bind-tokens'

interface ActivateBody {
  token?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<ActivateBody>(event)
  const token = body?.token?.trim()

  if (!token) {
    throw createError({
      statusCode: 400,
      data: { error: 'token is required', code: 'TOKEN_REQUIRED' },
    })
  }

  const { point } = await consumeBindToken(token, 'agent')

  return {
    pointId: point.slug,
    slug: point.slug,
    name: point.name,
  }
})
