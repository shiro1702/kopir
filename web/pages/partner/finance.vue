<script setup lang="ts">
import { formatPartnerRubles } from '~/utils/partner-format'

definePageMeta({
  layout: 'partner',
  middleware: 'partner-auth',
})

useHead({
  meta: [{ name: 'robots', content: 'noindex' }],
  title: 'Финансы — Kopir',
})

const { me, loading, fetchMe } = usePartnerSession()

const legalName = ref('')
const inn = ref('')
const accountNumber = ref('')
const bik = ref('')
const saving = ref(false)
const message = ref('')
const error = ref('')

function fillForm() {
  const req = me.value?.partner.requisites
  legalName.value = req?.legalName ?? ''
  inn.value = req?.inn ?? ''
  accountNumber.value = req?.accountNumber ?? ''
  bik.value = req?.bik ?? ''
}

async function saveRequisites() {
  saving.value = true
  message.value = ''
  error.value = ''
  try {
    await $fetch('/api/partner/requisites', {
      method: 'PATCH',
      body: {
        legalName: legalName.value,
        inn: inn.value,
        accountNumber: accountNumber.value,
        bik: bik.value,
      },
    })
    message.value = 'Реквизиты сохранены'
    await fetchMe()
    fillForm()
  } catch (err: unknown) {
    const msg = (err as { data?: { data?: { error?: string } } })?.data?.data?.error
    error.value = msg || 'Не удалось сохранить реквизиты'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await fetchMe()
  fillForm()
})
</script>

<template>
  <div>
    <h1 class="text-2xl font-semibold tracking-tight">
      Финансы
    </h1>
    <p class="mt-1 text-sm text-slate-500">
      Баланс к выплате и реквизиты для СБП
    </p>

    <div
      v-if="loading && !me"
      class="mt-6 text-sm text-slate-500"
    >
      Загрузка…
    </div>

    <template v-else-if="me">
      <section class="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <p class="text-sm text-slate-500">
          Баланс к выплате
        </p>
        <p class="mt-2 text-3xl font-semibold">
          {{ formatPartnerRubles(me.balanceKopeks) }}
        </p>
        <p class="mt-2 text-xs text-slate-500">
          Выплаты пока делает менеджер Kopir вручную (раз в неделю). Запрос «Вывести» появится позже.
        </p>
      </section>

      <section class="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 class="font-semibold">
          Реквизиты
        </h2>
        <p
          v-if="!me.partner.requisitesComplete"
          class="mt-2 text-sm text-amber-700"
        >
          Заполните реквизиты — без них выплата невозможна.
        </p>
        <div class="mt-4 space-y-3">
          <label class="block text-sm">
            <span class="text-slate-600">Юр. название / ИП</span>
            <input
              v-model="legalName"
              type="text"
              class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
            >
          </label>
          <label class="block text-sm">
            <span class="text-slate-600">ИНН</span>
            <input
              v-model="inn"
              type="text"
              inputmode="numeric"
              class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
            >
          </label>
          <label class="block text-sm">
            <span class="text-slate-600">Расчётный счёт</span>
            <input
              v-model="accountNumber"
              type="text"
              inputmode="numeric"
              class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
            >
          </label>
          <label class="block text-sm">
            <span class="text-slate-600">БИК</span>
            <input
              v-model="bik"
              type="text"
              inputmode="numeric"
              class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
            >
          </label>
          <button
            type="button"
            class="min-h-11 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-60"
            :disabled="saving"
            @click="saveRequisites"
          >
            {{ saving ? 'Сохраняем…' : 'Сохранить реквизиты' }}
          </button>
          <p
            v-if="message"
            class="text-sm text-emerald-700"
          >
            {{ message }}
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
          История
        </h2>
        <ul
          v-if="me.recentEntries.length"
          class="mt-3 divide-y divide-slate-100"
        >
          <li
            v-for="entry in me.recentEntries"
            :key="entry.id"
            class="flex items-center justify-between gap-3 py-3 text-sm"
          >
            <div>
              <p class="font-medium">
                {{ entry.type === 'CREDIT' ? 'Начисление' : 'Выплата' }}
                <span
                  v-if="entry.pointName"
                  class="font-normal text-slate-500"
                >· {{ entry.pointName }}</span>
              </p>
              <p class="text-xs text-slate-500">
                {{ new Date(entry.createdAt).toLocaleString('ru-RU') }}
              </p>
            </div>
            <p
              class="font-semibold"
              :class="entry.type === 'CREDIT' ? 'text-emerald-700' : 'text-slate-700'"
            >
              {{ entry.type === 'CREDIT' ? '+' : '−' }}{{ formatPartnerRubles(entry.amountKopeks) }}
            </p>
          </li>
        </ul>
        <p
          v-else
          class="mt-3 text-sm text-slate-500"
        >
          Пока нет операций
        </p>
      </section>
    </template>
  </div>
</template>
