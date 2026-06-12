import { assertMaxWebhookAuth, handleMaxUpdate } from '../../utils/max/handler'
import type { MaxUpdate } from '../../utils/max/types'

export default defineEventHandler(async (event) => {
  assertMaxWebhookAuth(event)

  const update = await readBody<MaxUpdate>(event)
  if (!update?.update_type) {
    throw createError({
      statusCode: 400,
      data: { error: 'Invalid MAX update payload', code: 'INVALID_PAYLOAD' },
    })
  }

  try {
    await handleMaxUpdate(update)
  } catch (error) {
    console.error('[max] webhook handler error:', error)
  }

  return { ok: true }
})
