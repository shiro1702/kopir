<script setup>
const props = defineProps({
  point: { type: Object, required: true },
  links: { type: Object, required: true },
  qrUrls: { type: Object, default: () => ({}) },
  adminConfig: { type: Object, default: null },
  showPosterDownload: { type: Boolean, default: false },
  posterDownloading: { type: Boolean, default: false },
})

const emit = defineEmits(['copy', 'close', 'download-poster'])

function formatPrice(kopeks) {
  return `${(kopeks / 100).toFixed(2)} ₽`
}

function maxStartFallback(slug) {
  return `/start ${slug}`
}
</script>

<template>
  <div class="mb-4 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
      <p class="font-semibold">
        Ссылка точки — {{ point.name }}
      </p>
      <span class="font-mono text-xs text-sky-800">{{ point.slug }}</span>
      <span class="text-xs text-sky-800">{{ formatPrice(point.pricePerPageKopeks) }}/стр.</span>
      <span :title="point.agentOnline ? 'Агент онлайн' : 'Агент офлайн'">
        {{ point.agentOnline ? '🟢' : '🔴' }}
      </span>
    </div>

    <div class="mt-4 rounded-md border border-sky-200 bg-white p-3">
      <p class="font-medium">
        Telegram
      </p>
      <div
        v-if="qrUrls.telegram"
        class="mt-3 flex flex-col items-start gap-3 sm:flex-row sm:items-center"
      >
        <img
          :src="qrUrls.telegram"
          alt="QR-код Telegram"
          width="300"
          height="300"
          class="rounded border border-gray-200 bg-white"
        >
        <div class="min-w-0 flex-1 space-y-2 text-xs">
          <p class="text-gray-600">
            Payload:
            <span class="font-mono">{{ links.telegramPayload }}</span>
          </p>
          <p class="break-all rounded bg-gray-50 px-2 py-1.5 font-mono">
            {{ links.telegramDeepLink }}
          </p>
          <div class="flex flex-wrap gap-2">
            <a
              :href="links.telegramDeepLink"
              target="_blank"
              rel="noopener noreferrer"
              class="rounded bg-[#229ED9] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a8bc4]"
            >
              Открыть в Telegram
            </a>
            <button
              class="rounded border border-sky-300 bg-white px-3 py-2 text-xs hover:bg-sky-50"
              @click="emit('copy', links.telegramDeepLink)"
            >
              Скопировать ссылку
            </button>
            <button
              class="rounded border border-sky-300 bg-white px-3 py-2 text-xs hover:bg-sky-50"
              @click="emit('copy', links.telegramPayload)"
            >
              Скопировать payload
            </button>
          </div>
        </div>
      </div>
      <p
        v-else-if="adminConfig?.telegramConfigured"
        class="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
      >
        Задайте <code class="font-mono">TELEGRAM_BOT_USERNAME</code> в <code class="font-mono">web/.env</code>,
        чтобы появилась ссылка и QR. Пока отправьте клиенту:
        <span class="font-mono">{{ maxStartFallback(links.telegramPayload) }}</span>
      </p>
      <div
        v-else
        class="mt-3 space-y-2 text-xs text-gray-600"
      >
        <p>Telegram-бот не настроен.</p>
        <p class="font-mono">
          Payload: {{ links.telegramPayload }}
        </p>
      </div>
    </div>

    <div
      v-if="adminConfig?.maxConfigured"
      class="mt-4 rounded-md border border-sky-200 bg-white p-3"
    >
      <p class="font-medium">
        MAX
      </p>
      <div
        v-if="qrUrls.max"
        class="mt-3 flex flex-col items-start gap-3 sm:flex-row sm:items-center"
      >
        <img
          :src="qrUrls.max"
          alt="QR-код MAX"
          width="300"
          height="300"
          class="rounded border border-gray-200 bg-white"
        >
        <div class="min-w-0 flex-1 space-y-2 text-xs">
          <p class="text-gray-600">
            Payload:
            <span class="font-mono">{{ links.maxPayload }}</span>
          </p>
          <p class="break-all rounded bg-gray-50 px-2 py-1.5 font-mono">
            {{ links.maxDeepLink }}
          </p>
          <div class="flex flex-wrap gap-2">
            <a
              :href="links.maxDeepLink"
              target="_blank"
              rel="noopener noreferrer"
              class="rounded bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
            >
              Открыть в MAX
            </a>
            <button
              class="rounded border border-sky-300 bg-white px-3 py-2 text-xs hover:bg-sky-50"
              @click="emit('copy', links.maxDeepLink)"
            >
              Скопировать ссылку
            </button>
            <button
              class="rounded border border-sky-300 bg-white px-3 py-2 text-xs hover:bg-sky-50"
              @click="emit('copy', links.maxPayload)"
            >
              Скопировать payload
            </button>
          </div>
        </div>
      </div>
      <div
        v-else
        class="mt-3 space-y-2 text-xs text-gray-600"
      >
        <p>
          Откройте бота в MAX и отправьте:
        </p>
        <p class="rounded bg-gray-50 px-2 py-1.5 font-mono">
          {{ maxStartFallback(links.maxPayload) }}
        </p>
        <button
          class="rounded border border-sky-300 bg-white px-3 py-1 text-xs hover:bg-sky-50"
          @click="emit('copy', maxStartFallback(links.maxPayload))"
        >
          Скопировать для MAX
        </button>
        <p
          v-if="!adminConfig?.maxBotLinkConfigured"
          class="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900"
        >
          Задайте <code class="font-mono">MAX_BOT_LINK</code> в <code class="font-mono">web/.env</code> для QR и deep link.
        </p>
      </div>
    </div>

    <div class="mt-4 rounded-md border border-sky-200 bg-white p-3">
      <p class="font-medium">
        Универсально
      </p>
      <p class="mt-1 text-xs text-gray-600">
        Единая ссылка для всех мессенджеров — скоро
      </p>
      <p
        v-if="links.goLink"
        class="mt-2 break-all rounded bg-gray-50 px-2 py-1.5 font-mono text-xs text-gray-400"
      >
        {{ links.goLink }}
      </p>
      <span
        class="mt-2 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500"
      >
        скоро
      </span>
    </div>

    <div
      v-if="showPosterDownload"
      class="mt-4"
    >
      <button
        class="rounded bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-700 disabled:opacity-50"
        :disabled="posterDownloading || !links.telegramDeepLink"
        @click="emit('download-poster')"
      >
        {{ posterDownloading ? 'Генерация…' : 'Скачать плакат' }}
      </button>
    </div>

    <button
      class="mt-4 text-xs text-sky-700 underline hover:text-sky-900"
      @click="emit('close')"
    >
      Закрыть
    </button>
  </div>
</template>
