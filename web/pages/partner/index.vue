<script setup lang="ts">
import { formatPartnerRubles, formatPricePerPage } from '~/utils/partner-format'

definePageMeta({
  layout: 'partner',
  middleware: 'partner-auth',
})

useHead({
  meta: [{ name: 'robots', content: 'noindex' }],
  title: 'Кабинет партнёра — Kopir',
})

const { me, loading, error, fetchMe } = usePartnerSession()
const partnerLinks = usePartnerBotLinks()

onMounted(() => {
  void fetchMe()
})
</script>

<template>
  <div>
    <div
      v-if="loading && !me"
      class="text-sm text-slate-500"
    >
      Загрузка…
    </div>
    <div
      v-else-if="error"
      class="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {{ error }}
    </div>
    <template v-else-if="me">
      <header class="mb-6">
        <h1 class="text-2xl font-semibold tracking-tight">
          {{ me.partner.name || 'Кабинет партнёра' }}
        </h1>
        <p class="mt-1 text-sm text-slate-500">
          Сегодня · страниц {{ me.today.pages }} · {{ formatPartnerRubles(me.today.amountKopeks) }}
        </p>
      </header>

      <section class="grid gap-3 sm:grid-cols-2">
        <div class="rounded-2xl border border-slate-200 bg-white p-5">
          <p class="text-sm text-slate-500">
            Баланс к выплате
          </p>
          <p class="mt-2 text-2xl font-semibold">
            {{ formatPartnerRubles(me.balanceKopeks) }}
          </p>
          <NuxtLink
            to="/partner/finance"
            class="mt-3 inline-flex text-sm font-medium text-blue-700 hover:underline"
          >
            Финансы и реквизиты →
          </NuxtLink>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-5">
          <p class="text-sm text-slate-500">
            Точек
          </p>
          <p class="mt-2 text-2xl font-semibold">
            {{ me.points.length }}
          </p>
          <NuxtLink
            to="/partner/points"
            class="mt-3 inline-flex text-sm font-medium text-blue-700 hover:underline"
          >
            Управление точками →
          </NuxtLink>
        </div>
      </section>

      <section
        v-if="me.points.length === 0"
        class="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5"
      >
        <h2 class="font-semibold text-amber-950">
          Точка ещё не подключена
        </h2>
        <p class="mt-2 text-sm leading-6 text-amber-900">
          Кабинет создан. Чтобы видеть заказы и баланс, менеджер Kopir привяжет точку
          или вы отправите в боте команду с токеном привязки.
        </p>
        <a
          v-if="partnerLinks.telegramPartnerUrl"
          :href="partnerLinks.telegramPartnerUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-4 inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white"
        >
          Открыть бот партнёра
        </a>
      </section>

      <section
        v-else
        class="mt-6"
      >
        <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Мои точки
        </h2>
        <ul class="space-y-3">
          <li
            v-for="point in me.points"
            :key="point.id"
          >
            <NuxtLink
              :to="`/partner/points/${point.id}`"
              class="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 hover:border-slate-300"
            >
              <div>
                <p class="font-medium">
                  {{ point.name }}
                </p>
                <p class="mt-1 text-sm text-slate-500">
                  {{ formatPricePerPage(point.pricePerPageKopeks) }}
                  <span v-if="point.displayCode"> · код {{ point.displayCode }}</span>
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
            </NuxtLink>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
