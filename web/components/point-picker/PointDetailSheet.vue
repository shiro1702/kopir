<script setup lang="ts">
import type { PublicPoint } from '~/types/point-picker'
import { doubleGisRoute, googleMapsRoute, yandexMapsRoute } from '~/utils/navigation-links'

const props = defineProps<{
  point: PublicPoint
  mode?: 'site' | 'miniapp'
}>()

const emit = defineEmits<{
  close: []
  select: [slug: string]
}>()

const { telegramPointUrl, maxPointUrl } = useClientBotLinks()

const priceLabel = computed(() =>
  `${(props.point.pricePerPageKopeks / 100).toLocaleString('ru-RU')} ₽/стр.`,
)

const routeLinks = computed(() => {
  if (props.point.lat == null || props.point.lng == null) {
    return []
  }
  return [
    { label: 'Яндекс.Карты', href: yandexMapsRoute(props.point.lat, props.point.lng) },
    { label: '2ГИС', href: doubleGisRoute(props.point.lat, props.point.lng) },
    { label: 'Google Maps', href: googleMapsRoute(props.point.lat, props.point.lng) },
  ]
})

function handleSelect() {
  if (!props.point.canSelect) {
    return
  }
  emit('select', props.point.slug)
  if (props.mode === 'miniapp') {
    return
  }
  const tg = telegramPointUrl(props.point.slug)
  if (tg && import.meta.client) {
    window.open(tg, '_blank')
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
    <div
      class="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-3xl"
      role="dialog"
      aria-modal="true"
    >
      <div class="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 class="text-xl font-semibold text-gray-900">
            {{ point.name }}
          </h2>
          <p
            v-if="point.address"
            class="mt-1 text-sm text-gray-600"
          >
            {{ point.address }}
          </p>
        </div>
        <button
          type="button"
          class="rounded-full p-2 text-gray-500 hover:bg-gray-100"
          aria-label="Закрыть"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>

      <img
        v-if="point.entryPhotoUrl"
        :src="point.entryPhotoUrl"
        :alt="`Вход: ${point.name}`"
        class="mb-4 h-40 w-full rounded-2xl object-cover"
      >

      <dl class="space-y-3 text-sm text-gray-700">
        <div>
          <dt class="font-medium text-gray-900">
            Статус
          </dt>
          <dd>{{ point.statusText }}</dd>
        </div>
        <div>
          <dt class="font-medium text-gray-900">
            Печать А4 ч/б
          </dt>
          <dd>{{ priceLabel }}</dd>
        </div>
        <div v-if="point.estimatedReadyMinutes">
          <dt class="font-medium text-gray-900">
            Готовность
          </dt>
          <dd>обычно {{ point.estimatedReadyMinutes }} минуты после оплаты</dd>
        </div>
        <div v-if="point.pickupInstructions">
          <dt class="font-medium text-gray-900">
            Как получить
          </dt>
          <dd>{{ point.pickupInstructions }}</dd>
        </div>
        <div>
          <dt class="font-medium text-gray-900">
            Онлайн-заказы
          </dt>
          <dd>{{ point.acceptsOnlineOrders ? 'Принимает заказы' : 'Временно недоступны' }}</dd>
        </div>
      </dl>

      <p
        v-if="point.closingSoon"
        class="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800"
      >
        Точка скоро закрывается. Убедитесь, что успеете забрать распечатку.
      </p>

      <div
        v-if="routeLinks.length"
        class="mt-5 flex flex-wrap gap-2"
      >
        <a
          v-for="link in routeLinks"
          :key="link.label"
          :href="link.href"
          target="_blank"
          rel="noopener noreferrer"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
        >
          {{ link.label }}
        </a>
      </div>

      <div class="mt-6 flex flex-wrap gap-2">
        <button
          v-if="point.canSelect"
          type="button"
          class="min-h-11 flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white"
          @click="handleSelect"
        >
          {{ mode === 'miniapp' ? 'Выбрать эту точку' : 'Печатать в Telegram' }}
        </button>
        <a
          v-if="maxPointUrl(point.slug) && mode !== 'miniapp'"
          :href="maxPointUrl(point.slug)!"
          target="_blank"
          rel="noopener noreferrer"
          class="min-h-11 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-800"
        >
          MAX
        </a>
      </div>
    </div>
  </div>
</template>
