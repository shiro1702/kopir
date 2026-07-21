<script setup lang="ts">
const route = useRoute()
const citySlug = computed(() => String(route.params.city ?? 'ulan-ude'))

definePageMeta({ layout: 'marketing' })

useSeoMeta({
  title: 'Точки печати на карте — Kopir',
  description: 'Выберите удобную точку печати А4 ч/б на карте или в списке и перейдите в Telegram-бот.',
})
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
    <PointPickerLayout :city-slug="citySlug" />
  </div>
</template>
