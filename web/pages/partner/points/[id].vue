<script setup lang="ts">
import {
  formatPartnerRubles,
  formatPricePerPage,
  PAYMENT_METHOD_LABELS,
} from '~/utils/partner-format'

definePageMeta({
  layout: 'partner',
  middleware: 'partner-auth',
})

const route = useRoute()
const pointId = computed(() => String(route.params.id))

type PointDetail = {
  point: {
    id: string
    slug: string
    name: string
    displayCode: string | null
    address: string | null
    isActive: boolean
    pricePerPageKopeks: number
    paymentMethodsEnabled: string[]
    transferPhone: string | null
    transferBankLabel: string | null
    commissionPercent: number
    lastSeenAt: string | null
    agentOnline: boolean
  }
  stats: { period: string, pages: number, amountKopeks: number }
  links: {
    telegramUrl?: string | null
    maxUrl?: string | null
    goUrl?: string | null
  }
}

const data = ref<PointDetail | null>(null)
const loading = ref(true)
const error = ref('')
const saving = ref(false)
const saveMessage = ref('')
const period = ref<'day' | 'week' | 'month'>('day')

const priceRub = ref('')
const methods = ref<string[]>([])

const manageableMethods = ['TBANK_SBP', 'TBANK_ONLINE']

useHead({
  meta: [{ name: 'robots', content: 'noindex' }],
  title: computed(() => data.value ? `${data.value.point.name} — Kopir` : 'Точка — Kopir'),
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch<PointDetail>(`/api/partner/points/${pointId.value}`, {
      query: { period: period.value },
    })
    data.value = res
    priceRub.value = String(res.point.pricePerPageKopeks / 100)
    methods.value = res.point.paymentMethodsEnabled.filter((m) =>
      manageableMethods.includes(m),
    )
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode
    error.value = status === 403 ? 'Нет доступа к точке' : 'Не удалось загрузить точку'
  } finally {
    loading.value = false
  }
}

async function saveSettings() {
  if (!data.value) return
  saving.value = true
  saveMessage.value = ''
  error.value = ''
  try {
    const pricePerPageKopeks = Math.round(Number(priceRub.value.replace(',', '.')) * 100)
    await $fetch(`/api/partner/points/${pointId.value}`, {
      method: 'PATCH',
      body: {
        pricePerPageKopeks,
        paymentMethodsEnabled: methods.value,
      },
    })
    saveMessage.value = 'Сохранено'
    await load()
  } catch (err: unknown) {
    const msg = (err as { data?: { data?: { error?: string } } })?.data?.data?.error
    error.value = msg || 'Не удалось сохранить'
  } finally {
    saving.value = false
  }
}

function toggleMethod(method: string) {
  if (methods.value.includes(method)) {
    methods.value = methods.value.filter((m) => m !== method)
  } else {
    methods.value = [...methods.value, method]
  }
}

watch(period, () => {
  void load()
})

onMounted(() => {
  void load()
})
</script>

<template>
  <div>
    <NuxtLink
      to="/partner/points"
      class="text-sm font-medium text-slate-500 hover:text-slate-800"
    >
      ← Все точки
    </NuxtLink>

    <div
      v-if="loading && !data"
      class="mt-6 text-sm text-slate-500"
    >
      Загрузка…
    </div>
    <div
      v-else-if="error && !data"
      class="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {{ error }}
    </div>

    <template v-else-if="data">
      <header class="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight">
            {{ data.point.name }}
          </h1>
          <p
            v-if="data.point.address"
            class="mt-1 text-sm text-slate-500"
          >
            {{ data.point.address }}
          </p>
        </div>
        <span
          class="rounded-full px-2.5 py-1 text-xs font-semibold"
          :class="data.point.agentOnline
            ? 'bg-emerald-100 text-emerald-800'
            : 'bg-slate-100 text-slate-600'"
        >
          {{ data.point.agentOnline ? 'Агент в сети' : 'Агент офлайн' }}
        </span>
      </header>

      <section class="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="font-semibold">
            Заказы
          </h2>
          <div class="flex gap-1">
            <button
              v-for="p in (['day', 'week', 'month'] as const)"
              :key="p"
              type="button"
              class="rounded-lg px-3 py-1.5 text-xs font-semibold"
              :class="period === p ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'"
              @click="period = p"
            >
              {{ p === 'day' ? 'День' : p === 'week' ? 'Неделя' : 'Месяц' }}
            </button>
          </div>
        </div>
        <p class="mt-3 text-sm text-slate-600">
          Страниц: {{ data.stats.pages }} ·
          {{ formatPartnerRubles(data.stats.amountKopeks) }}
        </p>
      </section>

      <section class="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 class="font-semibold">
          Настройки
        </h2>
        <div class="mt-4 space-y-4">
          <label class="block text-sm">
            <span class="text-slate-600">Цена за страницу, ₽</span>
            <input
              v-model="priceRub"
              type="text"
              inputmode="decimal"
              class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
            >
          </label>
          <div>
            <p class="text-sm text-slate-600">
              Способы оплаты (онлайн)
            </p>
            <div class="mt-2 flex flex-wrap gap-2">
              <button
                v-for="method in manageableMethods"
                :key="method"
                type="button"
                class="rounded-full px-3 py-1.5 text-xs font-semibold"
                :class="methods.includes(method)
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600'"
                @click="toggleMethod(method)"
              >
                {{ PAYMENT_METHOD_LABELS[method] || method }}
              </button>
            </div>
            <p class="mt-2 text-xs text-slate-500">
              Сейчас включено:
              {{ data.point.paymentMethodsEnabled.map((m) => PAYMENT_METHOD_LABELS[m] || m).join(', ') || '—' }}
            </p>
          </div>
          <button
            type="button"
            class="min-h-11 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-60"
            :disabled="saving"
            @click="saveSettings"
          >
            {{ saving ? 'Сохраняем…' : 'Сохранить' }}
          </button>
          <p
            v-if="saveMessage"
            class="text-sm text-emerald-700"
          >
            {{ saveMessage }}
          </p>
          <p
            v-if="error"
            class="text-sm text-red-600"
          >
            {{ error }}
          </p>
        </div>
      </section>

      <section class="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 class="font-semibold">
          Ссылки для клиентов
        </h2>
        <ul class="mt-3 space-y-2 text-sm">
          <li v-if="data.links.telegramUrl">
            <a
              :href="data.links.telegramUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-700 hover:underline"
            >
              Telegram
            </a>
          </li>
          <li v-if="data.links.maxUrl">
            <a
              :href="data.links.maxUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-700 hover:underline"
            >
              MAX
            </a>
          </li>
          <li v-if="data.links.goUrl">
            <a
              :href="data.links.goUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-700 hover:underline"
            >
              Универсальная /go
            </a>
          </li>
        </ul>
        <p class="mt-2 text-xs text-slate-500">
          Текущая цена: {{ formatPricePerPage(data.point.pricePerPageKopeks) }}
        </p>
      </section>
    </template>
  </div>
</template>
