export default defineEventHandler(async (event) => {
  try {
    const { getInitializedBot } = await import('../../utils/telegram/bot')
    const update = await readBody(event)
    const bot = await getInitializedBot()
    await bot.handleUpdate(update)
  } catch (error) {
    console.error('[telegram] webhook error:', error)
    throw createError({
      statusCode: 500,
      data: { error: 'Webhook handler failed', code: 'WEBHOOK_ERROR' },
    })
  }
})
