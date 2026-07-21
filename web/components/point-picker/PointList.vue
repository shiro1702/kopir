<script setup lang="ts">
import type { PublicPoint } from '~/types/point-picker'

const props = defineProps<{
  point: PublicPoint
  selected?: boolean
}>()

const emit = defineEmits<{
  select: [slug: string]
  openDetail: [slug: string]
}>()

const priceLabel = computed(() =>
  `${(props.point.pricePerPageKopeks / 100).toLocaleString('ru-RU')} ₽/стр.`,
)

const statusBadgeClass = computed(() => {
  switch (props.point.markerStatus) {
    case 'open':
      return 'bg-green-100 text-green-800'
    case 'closing':
      return 'bg-amber-100 text-amber-800'
    case 'offline':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-600'
  }
})
</script>

<template>
  <button
    type="button"
    class="w-full rounded-2xl border p-4 text-left transition"
    :class="selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'"
    @click="emit('openDetail', point.slug)"
  >
    <div class="flex items-start justify-between gap-3">
      <div>
        <h3 class="font-semibold text-gray-900">
          {{ point.name }}
        </h3>
        <p
          v-if="point.address"
          class="mt-1 text-sm text-gray-600"
        >
          {{ point.address }}
        </p>
      </div>
      <span
        class="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
        :class="statusBadgeClass"
      >
        {{ point.agentOnline ? point.statusText : 'Офлайн' }}
      </span>
    </div>
    <p class="mt-3 text-sm text-gray-700">
      А4 ч/б — {{ priceLabel }}
      <span v-if="point.distanceText"> · {{ point.distanceText }}</span>
    </p>
    <p
      v-if="point.estimatedReadyMinutes"
      class="mt-1 text-sm text-gray-500"
    >
      Готовность: {{ point.estimatedReadyMinutes }} мин
    </p>
    <div class="mt-4 flex flex-wrap gap-2">
      <button
        v-if="point.canSelect"
        type="button"
        class="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white"
        @click.stop="emit('select', point.slug)"
      >
        Выбрать
      </button>
      <button
        type="button"
        class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
        @click.stop="emit('openDetail', point.slug)"
      >
        Подробнее
      </button>
    </div>
  </button>
</template>
