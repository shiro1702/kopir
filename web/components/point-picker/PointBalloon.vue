<script setup lang="ts">
import type { PublicPoint } from '~/types/point-picker'

const props = defineProps<{
  point: PublicPoint
  compact?: boolean
}>()

const emit = defineEmits<{
  select: []
  details: []
}>()

const { telegramPointUrl, maxPointUrl } = useClientBotLinks()

const priceLabel = computed(() =>
  `${(props.point.pricePerPageKopeks / 100).toLocaleString('ru-RU')} ₽/стр.`,
)

function onSelect() {
  if (!props.point.canSelect) {
    return
  }
  emit('select')
  const url = telegramPointUrl(props.point.slug)
  if (url && import.meta.client) {
    window.open(url, '_blank')
  }
}
</script>

<template>
  <div class="space-y-2 text-sm">
    <p class="font-semibold text-gray-900">
      {{ point.name }}
    </p>
    <p
      v-if="point.address"
      class="text-gray-600"
    >
      {{ point.address }}
    </p>
    <p class="text-gray-700">
      {{ point.statusText }} · {{ priceLabel }}
      <span v-if="point.distanceText"> · {{ point.distanceText }}</span>
    </p>
    <p
      v-if="point.closingSoon"
      class="text-amber-700"
    >
      Скоро закрывается — успейте забрать распечатку
    </p>
    <div class="flex flex-wrap gap-2 pt-1">
      <button
        v-if="point.canSelect"
        type="button"
        class="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white"
        @click="onSelect"
      >
        Выбрать
      </button>
      <button
        type="button"
        class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
        @click="emit('details')"
      >
        Подробнее
      </button>
    </div>
  </div>
</template>
