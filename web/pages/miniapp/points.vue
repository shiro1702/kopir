<script setup lang="ts">
definePageMeta({ layout: 'miniapp' })

type TelegramWebApp = {
  ready: () => void
  expand: () => void
  close: () => void
  sendData: (data: string) => void
  BackButton: {
    show: () => void
    hide: () => void
    onClick: (cb: () => void) => void
    offClick: (cb: () => void) => void
  }
  MainButton: {
    setText: (text: string) => void
    show: () => void
    hide: () => void
    onClick: (cb: () => void) => void
    offClick: (cb: () => void) => void
  }
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp
    }
  }
}

const webApp = ref<TelegramWebApp | null>(null)
const pendingSlug = ref<string | null>(null)

function getWebApp(): TelegramWebApp | null {
  if (!import.meta.client) {
    return null
  }
  return window.Telegram?.WebApp ?? null
}

function confirmSelection(slug: string) {
  pendingSlug.value = slug
  const app = webApp.value
  if (app?.MainButton) {
    app.MainButton.setText('Выбрать эту точку')
    app.MainButton.show()
  }
}

function submitSelection() {
  const slug = pendingSlug.value
  const app = webApp.value
  if (!slug || !app) {
    return
  }
  app.sendData(JSON.stringify({ type: 'point_selected', slug }))
  app.close()
}

onMounted(() => {
  const app = getWebApp()
  if (!app) {
    return
  }
  webApp.value = app
  app.ready()
  app.expand()
  app.BackButton.show()
  app.BackButton.onClick(() => {
    app.close()
  })
  app.MainButton.onClick(submitSelection)
})

onBeforeUnmount(() => {
  const app = webApp.value
  if (!app) {
    return
  }
  app.MainButton.hide()
  app.BackButton.hide()
})
</script>

<template>
  <div class="px-4 py-4">
    <PointPickerLayout
      mode="miniapp"
      title="Выберите точку печати"
      subtitle="Нажмите на точку на карте или в списке, затем подтвердите выбор."
      @select="confirmSelection"
    />
    <p
      v-if="pendingSlug"
      class="mt-4 text-center text-sm text-gray-600"
    >
      Нажмите «Выбрать эту точку» внизу экрана Telegram
    </p>
  </div>
</template>
