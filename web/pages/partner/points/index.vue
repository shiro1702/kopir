<script setup lang="ts">
import { formatPartnerRubles, formatPricePerPage } from '~/utils/partner-format'

definePageMeta({
  layout: 'partner',
  middleware: 'partner-auth',
})

useHead({
  meta: [{ name: 'robots', content: 'noindex' }],
  title: 'Мои точки — Kopir',
})

const { me, loading, fetchMe } = usePartnerSession()

onMounted(() => {
  void fetchMe()
})
</script>

<template>
  <div>
    <h1 class="text-2xl font-semibold tracking-tight">
      Мои точки
    </h1>
    <p class="mt-1 text-sm text-slate-500">
      Статус агента, цена и ссылки для клиентов
    </p>

    <div
      v-if="loading && !me"
      class="mt-6 text-sm text-slate-500"
    >
      Загрузка…
    </div>

    <div
      v-else-if="me && me.points.length === 0"
      class="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600"
    >
      Пока нет привязанных точек. Напишите менеджеру Kopir или используйте токен
      <code class="rounded bg-slate-100 px-1">/partner bind_…</code> в боте.
    </div>

    <ul
      v-else-if="me"
      class="mt-6 space-y-3"
    >
      <li
        v-for="point in me.points"
        :key="point.id"
      >
        <NuxtLink
          :to="`/partner/points/${point.id}`"
          class="block rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-300"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="font-semibold">
                {{ point.name }}
              </h2>
              <p
                v-if="point.address"
                class="mt-1 text-sm text-slate-500"
              >
                {{ point.address }}
              </p>
              <p class="mt-2 text-sm text-slate-600">
                {{ formatPricePerPage(point.pricePerPageKopeks) }}
                · доля партнёра {{ 100 - point.commissionPercent }}%
              </p>
            </div>
            <span
              class="rounded-full px-2.5 py-1 text-xs font-semibold"
              :class="point.agentOnline
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-slate-100 text-slate-600'"
            >
              {{ point.agentOnline ? 'В сети' : 'Офлайн' }}
            </span>
          </div>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
