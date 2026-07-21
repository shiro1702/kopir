<script setup lang="ts">
import type { PublicPoint } from '~/types/point-picker'

const props = withDefaults(defineProps<{
  citySlug?: string
  mode?: 'site' | 'miniapp'
  title?: string
  subtitle?: string
}>(), {
  citySlug: 'ulan-ude',
  mode: 'site',
  title: 'Где забрать распечатку',
  subtitle: 'Выберите точку печати на карте или в списке. После выбора вы сможете отправить файл в Telegram-бот.',
})

const emit = defineEmits<{
  select: [slug: string]
}>()

const {
  sortedPoints,
  mappablePoints,
  nearestOpenPoint,
  loading,
  error,
  selectedSlug,
  detailPoint,
  userCoords,
  geoLoading,
  geoError,
  openDetail,
  closeDetail,
  requestGeolocation,
} = usePointPicker(props.citySlug)

const mapRef = ref<{ focusPoint: (point: PublicPoint | null) => void } | null>(null)

const { telegramPointUrl } = useClientBotLinks()

function handleSelect(slug: string) {
  if (props.mode === 'miniapp') {
    emit('select', slug)
    return
  }
  const url = telegramPointUrl(slug)
  if (url && import.meta.client) {
    window.open(url, '_blank')
  }
}

function handleOpenDetail(slug: string) {
  openDetail(slug)
  const point = sortedPoints.value.find((p) => p.slug === slug) ?? null
  mapRef.value?.focusPoint(point)
}

function selectNearest() {
  if (!nearestOpenPoint.value) {
    return
  }
  handleSelect(nearestOpenPoint.value.slug)
}
</script>

<template>
  <section class="space-y-4">
    <div>
      <h2 class="text-2xl font-bold text-gray-900">
        {{ title }}
      </h2>
      <p class="mt-2 text-gray-600">
        {{ subtitle }}
      </p>
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        class="min-h-11 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800"
        :disabled="geoLoading"
        @click="requestGeolocation"
      >
        {{ geoLoading ? 'Определяем…' : 'Показать рядом со мной' }}
      </button>
    </div>
    <p
      v-if="geoError"
      class="text-sm text-red-600"
    >
      {{ geoError }}
    </p>

    <div
      v-if="nearestOpenPoint && userCoords"
      class="rounded-2xl border border-blue-200 bg-blue-50 p-4"
    >
      <p class="text-sm font-medium text-blue-900">
        Ближайшая открытая точка: {{ nearestOpenPoint.name }}
        <span v-if="nearestOpenPoint.distanceText"> · {{ nearestOpenPoint.distanceText }}</span>
      </p>
      <div class="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white"
          @click="selectNearest"
        >
          Печатать здесь
        </button>
      </div>
    </div>

    <div
      v-if="loading"
      class="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600"
    >
      Загружаем точки печати…
    </div>

    <p
      v-else-if="error"
      class="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
    >
      {{ error }}
    </p>

    <div
      v-else
      class="grid gap-4 lg:grid-cols-[minmax(280px,360px)_1fr] lg:items-start"
    >
      <div class="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
        <PointList
          v-for="point in sortedPoints"
          :key="point.slug"
          :point="point"
          :selected="point.slug === selectedSlug"
          @select="handleSelect"
          @open-detail="handleOpenDetail"
        />
        <p
          v-if="sortedPoints.length === 0"
          class="rounded-2xl border border-dashed border-gray-300 p-6 text-sm text-gray-600"
        >
          Пока нет точек в этом городе.
        </p>
      </div>

      <ClientOnly>
        <PointMap
          ref="mapRef"
          :points="mappablePoints"
          :selected-slug="selectedSlug"
          :user-coords="userCoords"
          @open-detail="handleOpenDetail"
          @select="handleSelect"
        />
        <template #fallback>
          <div class="flex min-h-[280px] items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 text-sm text-gray-500">
            Загрузка карты…
          </div>
        </template>
      </ClientOnly>
    </div>

    <PointDetailSheet
      v-if="detailPoint"
      :point="detailPoint"
      :mode="mode"
      @close="closeDetail"
      @select="handleSelect"
    />
  </section>
</template>
