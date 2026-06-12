import type { H3Event } from 'h3'

export function assertAgentAuth(event: H3Event) {
  const config = useRuntimeConfig(event)
  const authHeader = getHeader(event, 'authorization')
  const expected = `Bearer ${config.agentApiKey}`

  if (!config.agentApiKey || authHeader !== expected) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      data: { error: 'Invalid agent API key', code: 'UNAUTHORIZED' },
    })
  }
}
