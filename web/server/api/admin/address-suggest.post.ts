import { assertAdminAuth } from '../../utils/admin-auth'
import { fetchDadataAddressSuggestions } from '../../utils/dadata'

export default defineEventHandler(async (event) => {
  assertAdminAuth(event)

  const config = useRuntimeConfig()
  const token = String(config.dadataToken ?? '').trim()
  if (!token) {
    throw createError({
      statusCode: 503,
      data: {
        error: 'Подсказки адреса не настроены (DADATA_TOKEN)',
        code: 'DADATA_NOT_CONFIGURED',
      },
    })
  }

  const body = await readBody(event)
  const query = String(body?.query ?? '').trim()
  if (!query) {
    return { suggestions: [] }
  }

  const citySlug = body?.citySlug != null ? String(body.citySlug).trim() : undefined
  const suggestions = await fetchDadataAddressSuggestions(token, query, { citySlug })

  return { suggestions }
})
