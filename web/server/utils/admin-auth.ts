import type { H3Event } from 'h3'

export function assertAdminAuth(event: H3Event) {
  const config = useRuntimeConfig(event)
  const authHeader = getHeader(event, 'authorization')
  const expected = `Bearer ${config.adminSecret}`

  if (!config.adminSecret || authHeader !== expected) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      data: { error: 'Invalid admin secret', code: 'UNAUTHORIZED' },
    })
  }
}
