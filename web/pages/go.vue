<script setup lang="ts">
type GoPageData = {
  point: {
    slug: string
    name: string
    pricePerPageKopeks: number
    agentOnline: boolean
  }
  links: {
    telegramDeepLink: string | null
    maxDeepLink: string | null
    goLink: string | null
    payload: string
  }
  channels: {
    telegramConfigured: boolean
    maxConfigured: boolean
    goConfigured: boolean
  }
  telegramBotUsername: string | null
  maxBotLabel: string | null
}

definePageMeta({ layout: 'marketing' })

const route = useRoute()
const pointSlug = computed(() => String(route.query.point ?? '').trim())
const messengerPref = computed(() => String(route.query.m ?? '').trim())

const { data, error } = await useFetch<GoPageData>(() => `/api/go?point=${encodeURIComponent(pointSlug.value)}`, {
  watch: [pointSlug],
})

const isIos = ref(false)
const maxInstructionsOpen = ref(false)
const copied = ref(false)

onMounted(() => {
  isIos.value = /iPad|iPhone|iPod/.test(navigator.userAgent)
  if (messengerPref.value === 'max' || (isIos.value && messengerPref.value !== 'telegram')) {
    maxInstructionsOpen.value = true
  }
})

const startCommand = computed(() => {
  const payload = data.value?.links.payload
  return payload ? `/start ${payload}` : '/start'
})

const priceLabel = computed(() => {
  const kopeks = data.value?.point.pricePerPageKopeks ?? 0
  return `${(kopeks / 100).toFixed(kopeks % 100 === 0 ? 0 : 2)} ₽`
})

useSeoMeta({
  title: () => data.value ? `Печать в «${data.value.point.name}» — Kopir` : 'Печать — Kopir',
  description: () => data.value
    ? `Отправьте файл в бот и заберите распечатку в «${data.value.point.name}». А4 ч/б от ${priceLabel.value}/стр.`
    : 'Печать документов через Telegram или MAX',
  robots: 'noindex, nofollow',
})

async function copyStartCommand() {
  if (!import.meta.client) {
    return
  }
  try {
    await navigator.clipboard.writeText(startCommand.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    copied.value = false
  }
}
</script>

<template>
  <div class="py-10 sm:py-14">
    <div
      v-if="!pointSlug"
      class="mx-auto max-w-lg px-4 text-center sm:px-6"
    >
      <h1 class="text-2xl font-bold text-gray-900">
        Точка не указана
      </h1>
      <p class="mt-3 text-gray-600">
        Отсканируйте QR-код на стойке копицентра или выберите точку на сайте.
      </p>
      <NuxtLink
        to="/"
        class="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-blue-600 hover:underline"
      >
        На главную →
      </NuxtLink>
    </div>

    <div
      v-else-if="error"
      class="mx-auto max-w-lg px-4 text-center sm:px-6"
    >
      <h1 class="text-2xl font-bold text-gray-900">
        Точка не найдена
      </h1>
      <p class="mt-3 text-gray-600">
        Проверьте QR-код или попросите сотрудника показать актуальную ссылку.
      </p>
    </div>

    <div
      v-else-if="data"
      class="mx-auto max-w-lg px-4 sm:px-6"
    >
      <div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <p class="text-sm font-medium text-gray-500">
          Печать в точке
        </p>
        <h1 class="mt-1 text-2xl font-bold text-gray-900">
          {{ data.point.name }}
        </h1>
        <div class="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span class="rounded-full bg-gray-100 px-3 py-1 text-gray-700">
            А4 ч/б — от {{ priceLabel }}/стр.
          </span>
          <span
            class="rounded-full px-3 py-1"
            :class="data.point.agentOnline ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-900'"
          >
            {{ data.point.agentOnline ? '🟢 Принтер в сети' : '🔴 Принтер офлайн' }}
          </span>
        </div>

        <p
          v-if="!data.point.agentOnline"
          class="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          Сейчас печать может быть недоступна. Уточните у оператора или попробуйте позже.
        </p>

        <p class="mt-5 text-sm leading-6 text-gray-600">
          Выберите мессенджер, отправьте PDF или Word в бот, оплатите и заберите распечатку.
        </p>

        <div
          v-if="data.links.telegramDeepLink"
          class="mt-6"
        >
          <a
            :href="data.links.telegramDeepLink"
            class="flex min-h-12 w-full items-center justify-center rounded-xl bg-[#229ED9] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1a8bc4]"
          >
            Открыть в Telegram
          </a>
          <p
            v-if="data.telegramBotUsername"
            class="mt-2 text-center text-xs text-gray-500"
          >
            @{{ data.telegramBotUsername.replace(/^@/, '') }}
            <span v-if="isIos"> · рекомендуем на iPhone</span>
          </p>
        </div>

        <div
          v-if="data.links.maxDeepLink"
          class="mt-4"
        >
          <template v-if="!isIos">
            <a
              :href="data.links.maxDeepLink"
              class="flex min-h-12 w-full items-center justify-center rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
            >
              Открыть в MAX
            </a>
            <p
              v-if="data.maxBotLabel"
              class="mt-2 text-center text-xs text-gray-500"
            >
              {{ data.maxBotLabel }}
            </p>
          </template>
          <template v-else>
            <button
              type="button"
              class="flex min-h-12 w-full items-center justify-center rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-900"
              @click="maxInstructionsOpen = !maxInstructionsOpen"
            >
              MAX на iPhone
              <span class="ml-2 text-violet-600">{{ maxInstructionsOpen ? '▲' : '▼' }}</span>
            </button>
            <div
              v-if="maxInstructionsOpen"
              class="mt-3 rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-sm text-violet-950"
            >
              <ol class="list-decimal space-y-2 pl-4">
                <li>Откройте <strong>MAX с иконки на экране «Домой»</strong> (не через Safari).</li>
                <li>
                  Найдите бота
                  <span v-if="data.maxBotLabel">«{{ data.maxBotLabel }}»</span>.
                </li>
                <li>
                  Отправьте команду:
                  <code class="mt-1 block rounded bg-white px-2 py-1 font-mono text-xs">{{ startCommand }}</code>
                </li>
              </ol>
              <button
                type="button"
                class="mt-3 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-medium text-violet-900 hover:bg-violet-50"
                @click="copyStartCommand"
              >
                {{ copied ? 'Скопировано' : 'Скопировать команду' }}
              </button>
            </div>
          </template>
        </div>

        <div
          v-if="!data.links.telegramDeepLink && !data.links.maxDeepLink"
          class="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          Боты временно не настроены. Обратитесь к оператору точки.
        </div>

        <div class="mt-6 border-t border-gray-100 pt-5">
          <p class="text-xs font-medium uppercase tracking-wide text-gray-500">
            Запасной способ
          </p>
          <p class="mt-2 text-sm text-gray-600">
            Откройте бота вручную и отправьте:
          </p>
          <code class="mt-2 block rounded-lg bg-gray-50 px-3 py-2 font-mono text-sm text-gray-900">
            {{ startCommand }}
          </code>
          <button
            type="button"
            class="mt-3 text-sm font-semibold text-blue-600 hover:underline"
            @click="copyStartCommand"
          >
            {{ copied ? 'Скопировано' : 'Скопировать' }}
          </button>
        </div>
      </div>

      <p class="mt-6 text-center text-xs text-gray-500">
        1. Файл → 2. Копии → 3. Оплата → 4. Заберите у принтера
      </p>
    </div>
  </div>
</template>
