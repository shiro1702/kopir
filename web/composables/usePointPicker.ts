import type { PublicPoint } from '~/types/point-picker'
import { DEFAULT_CITY_SLUG } from '~/types/point-picker'

type UserCoords = { lat: number, lng: number }

export function usePointPicker(citySlug = DEFAULT_CITY_SLUG) {
  const points = ref<PublicPoint[]>([])
  const loading = ref(true)
  const error = ref('')
  const selectedSlug = ref<string | null>(null)
  const detailSlug = ref<string | null>(null)
  const userCoords = ref<UserCoords | null>(null)
  const geoLoading = ref(false)
  const geoError = ref('')

  const selectedPoint = computed(() =>
    points.value.find((p) => p.slug === selectedSlug.value) ?? null,
  )

  const detailPoint = computed(() =>
    points.value.find((p) => p.slug === detailSlug.value) ?? null,
  )

  const sortedPoints = computed(() => {
    const list = [...points.value]
    list.sort((a, b) => {
      if (a.canSelect !== b.canSelect) {
        return a.canSelect ? -1 : 1
      }
      if (a.distanceKm != null && b.distanceKm != null) {
        return a.distanceKm - b.distanceKm
      }
      if (a.distanceKm != null) return -1
      if (b.distanceKm != null) return 1
      return a.name.localeCompare(b.name, 'ru')
    })
    return list
  })

  const mappablePoints = computed(() =>
    sortedPoints.value.filter((p) => p.lat != null && p.lng != null),
  )

  const nearestOpenPoint = computed(() =>
    sortedPoints.value.find((p) => p.canSelect) ?? null,
  )

  async function fetchPoints() {
    loading.value = true
    error.value = ''
    try {
      const params: Record<string, string> = { city: citySlug }
      if (userCoords.value) {
        params.userLat = String(userCoords.value.lat)
        params.userLng = String(userCoords.value.lng)
      }
      const data = await $fetch<{ points: PublicPoint[] }>('/api/points', { query: params })
      points.value = data.points
    } catch (e: unknown) {
      const err = e as { data?: { error?: string } }
      error.value = err?.data?.error ?? 'Не удалось загрузить точки'
      points.value = []
    } finally {
      loading.value = false
    }
  }

  function selectPoint(slug: string) {
    selectedSlug.value = slug
  }

  function openDetail(slug: string) {
    detailSlug.value = slug
    selectedSlug.value = slug
  }

  function closeDetail() {
    detailSlug.value = null
  }

  async function requestGeolocation() {
    if (!import.meta.client || !navigator.geolocation) {
      geoError.value = 'Геолокация недоступна в этом браузере'
      return
    }
    geoLoading.value = true
    geoError.value = ''
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        })
      })
      userCoords.value = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      }
      await fetchPoints()
    } catch {
      geoError.value = 'Не удалось определить местоположение'
    } finally {
      geoLoading.value = false
    }
  }

  watch(userCoords, () => {
    if (!loading.value) {
      fetchPoints()
    }
  })

  onMounted(() => {
    fetchPoints()
  })

  return {
    points,
    sortedPoints,
    mappablePoints,
    nearestOpenPoint,
    loading,
    error,
    selectedSlug,
    selectedPoint,
    detailSlug,
    detailPoint,
    userCoords,
    geoLoading,
    geoError,
    fetchPoints,
    selectPoint,
    openDetail,
    closeDetail,
    requestGeolocation,
  }
}
