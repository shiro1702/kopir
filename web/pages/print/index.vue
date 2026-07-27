<script setup lang="ts">
definePageMeta({ layout: 'marketing' })

const route = useRoute()
const pointSlug = computed(() => {
  const raw = route.query.point
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null
})
const batchId = computed(() => {
  const raw = route.query.batch
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null
})

useSeoMeta({
  title: 'Печать документов онлайн — Kopir',
  description:
    'Загрузите PDF или Word на сайте, выберите точку печати, оплатите СБП и заберите распечатку. Без регистрации.',
})
</script>

<template>
  <div class="border-b border-gray-200/80 bg-gradient-to-b from-slate-50 to-white py-10 sm:py-14">
    <div class="mx-auto max-w-4xl px-4 sm:px-6">
      <PrintWizard
        mode="site"
        :initial-point-slug="pointSlug"
        :initial-batch-id="batchId"
      />
      <p class="mt-8 text-center text-sm text-gray-500">
        Нужна карта точек?
        <NuxtLink
          to="/print/ulan-ude"
          class="font-semibold text-blue-600 hover:underline"
        >
          Смотреть точки в Улан-Удэ
        </NuxtLink>
      </p>
    </div>
  </div>
</template>
