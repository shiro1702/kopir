<script setup lang="ts">
definePageMeta({ layout: 'miniapp' })

const route = useRoute()

const pointFromQuery = computed(() => {
  const raw = route.query.point
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null
})

onMounted(() => {
  if (!import.meta.client) {
    return
  }
  const script = document.createElement('script')
  script.src = 'https://telegram.org/js/telegram-web-app.js'
  script.async = true
  document.head.appendChild(script)
})
</script>

<template>
  <div class="px-4 py-4">
    <ClientOnly>
      <PrintWizard
        mode="miniapp"
        :initial-point-slug="pointFromQuery"
      />
      <template #fallback>
        <p class="py-8 text-center text-sm text-gray-600">
          Загрузка…
        </p>
      </template>
    </ClientOnly>
  </div>
</template>
