export interface DadataAddressSuggestion {
  address: string
  lat: number | null
  lng: number | null
}

interface DadataSuggestResponse {
  suggestions?: Array<{
    value: string
    data?: {
      geo_lat?: string | null
      geo_lon?: string | null
    }
  }>
}

const DADATA_SUGGEST_URL = 'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address'

const CITY_FILTER_BY_SLUG: Record<string, string> = {
  'ulan-ude': 'Улан-Удэ',
}

export function resolveDadataCityFilter(citySlug?: string | null): string | undefined {
  if (!citySlug) {
    return undefined
  }
  return CITY_FILTER_BY_SLUG[citySlug.trim().toLowerCase()]
}

function parseCoord(raw: string | null | undefined): number | null {
  if (raw == null || raw === '') {
    return null
  }
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

export function mapDadataSuggestions(payload: DadataSuggestResponse): DadataAddressSuggestion[] {
  return (payload.suggestions ?? []).map((item) => ({
    address: item.value,
    lat: parseCoord(item.data?.geo_lat),
    lng: parseCoord(item.data?.geo_lon),
  }))
}

export async function fetchDadataAddressSuggestions(
  token: string,
  query: string,
  options?: { citySlug?: string | null, count?: number },
): Promise<DadataAddressSuggestion[]> {
  const trimmed = query.trim()
  if (!trimmed) {
    return []
  }

  const city = resolveDadataCityFilter(options?.citySlug)
  const body: Record<string, unknown> = {
    query: trimmed,
    count: options?.count ?? 8,
  }
  if (city) {
    body.locations = [{ city }]
  }

  const response = await fetch(DADATA_SUGGEST_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Token ${token}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw createError({
      statusCode: response.status === 429 ? 429 : 502,
      data: {
        error: 'Не удалось получить подсказки адреса',
        code: 'DADATA_UNAVAILABLE',
      },
    })
  }

  const payload = await response.json() as DadataSuggestResponse
  return mapDadataSuggestions(payload)
}
