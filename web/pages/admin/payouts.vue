<script setup>
const { adminSecret, saveSecret: persistAdminSecret, authHeaders, rememberOnSuccess } = useAdminAuth()

const partners = ref([])
const totalKopeks = ref(0)
const selected = ref(new Set())
const loading = ref(false)
const error = ref('')
const success = ref('')
const downloading = ref('')
const markingPaid = ref(false)
const reportingId = ref('')

const now = new Date()
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
const periodLabel = ref('')
const reportMonth = ref(currentMonth)

const editing = ref(null)
const editForm = ref({ legalName: '', inn: '', accountNumber: '', bik: '' })
const savingRequisites = ref(false)

useHead({
  meta: [{ name: 'robots', content: 'noindex' }],
})

onMounted(() => {
  if (adminSecret.value) {
    fetchPayouts()
  }
})

const allSelected = computed(() =>
  partners.value.length > 0 && partners.value.every((p) => selected.value.has(p.partnerId)),
)

const selectedTotalKopeks = computed(() =>
  partners.value
    .filter((p) => selected.value.has(p.partnerId))
    .reduce((sum, p) => sum + p.balanceKopeks, 0),
)

const selectedIds = computed(() => [...selected.value])

function saveSecret() {
  const validationError = persistAdminSecret()
  if (validationError) {
    error.value = validationError
    return
  }
  error.value = ''
  fetchPayouts()
}

async function fetchPayouts() {
  if (!adminSecret.value) return
  loading.value = true
  error.value = ''
  try {
    const data = await $fetch('/api/admin/payouts', { headers: authHeaders() })
    rememberOnSuccess()
    partners.value = data.partners
    totalKopeks.value = data.totalKopeks
    const next = new Set()
    for (const p of partners.value) {
      if (p.requisitesComplete) next.add(p.partnerId)
    }
    selected.value = next
  } catch (e) {
    error.value = e?.data?.error ?? 'Ошибка загрузки выплат'
    partners.value = []
  } finally {
    loading.value = false
  }
}

function toggleAll() {
  if (allSelected.value) {
    selected.value = new Set()
  } else {
    selected.value = new Set(partners.value.map((p) => p.partnerId))
  }
}

function toggleOne(partnerId) {
  const next = new Set(selected.value)
  if (next.has(partnerId)) {
    next.delete(partnerId)
  } else {
    next.add(partnerId)
  }
  selected.value = next
}

async function downloadRegistry(format) {
  if (!adminSecret.value || downloading.value) return
  if (selectedIds.value.length === 0) {
    error.value = 'Выберите хотя бы одного партнёра'
    return
  }
  downloading.value = format
  error.value = ''
  try {
    const blob = await $fetch('/api/admin/payouts/registry', {
      method: 'POST',
      headers: authHeaders(),
      body: {
        partnerIds: selectedIds.value,
        format,
        periodLabel: periodLabel.value.trim() || undefined,
      },
      responseType: 'blob',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    const ext = format === 'xml' ? 'xml' : 'txt'
    const suffix = format === '1c' ? '-1c' : ''
    anchor.download = `kopir-payouts-${currentMonth}${suffix}.${ext}`
    anchor.click()
    URL.revokeObjectURL(url)
    success.value = 'Реестр скачан'
    setTimeout(() => { success.value = '' }, 2000)
  } catch (e) {
    error.value = await extractError(e, 'Не удалось сформировать реестр')
  } finally {
    downloading.value = ''
  }
}

async function markPaid() {
  if (!adminSecret.value || markingPaid.value) return
  if (selectedIds.value.length === 0) {
    error.value = 'Выберите партнёров для отметки'
    return
  }
  if (!confirm(`Отметить выплату для ${selectedIds.value.length} партнёр(ов)? Баланс будет обнулён.`)) {
    return
  }
  markingPaid.value = true
  error.value = ''
  try {
    const data = await $fetch('/api/admin/payouts/mark-paid', {
      method: 'POST',
      headers: authHeaders(),
      body: { partnerIds: selectedIds.value },
    })
    success.value = `Выплачено: ${formatAmount(data.paidKopeks)}`
    setTimeout(() => { success.value = '' }, 3000)
    await fetchPayouts()
  } catch (e) {
    error.value = e?.data?.error ?? 'Не удалось отметить выплату'
  } finally {
    markingPaid.value = false
  }
}

async function downloadReport(partner) {
  if (!adminSecret.value || reportingId.value) return
  const month = reportMonth.value.trim()
  if (!/^\d{4}-\d{2}$/.test(month)) {
    error.value = 'Укажите месяц в формате ГГГГ-ММ'
    return
  }
  reportingId.value = partner.partnerId
  error.value = ''
  try {
    const blob = await $fetch('/api/admin/payouts/agent-report.pdf', {
      headers: authHeaders(),
      query: { partnerId: partner.partnerId, month },
      responseType: 'blob',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `kopir-agent-report-${month}-${partner.partnerId}.pdf`
    anchor.click()
    URL.revokeObjectURL(url)
    success.value = 'Отчёт скачан'
    setTimeout(() => { success.value = '' }, 2000)
  } catch (e) {
    error.value = await extractError(e, 'Не удалось сформировать отчёт')
  } finally {
    reportingId.value = ''
  }
}

function openEdit(partner) {
  editing.value = partner
  const r = partner.requisites ?? {}
  editForm.value = {
    legalName: r.legalName ?? '',
    inn: r.inn ?? '',
    accountNumber: r.accountNumber ?? '',
    bik: r.bik ?? '',
  }
}

function closeEdit() {
  editing.value = null
}

async function saveRequisites() {
  if (!editing.value || savingRequisites.value) return
  savingRequisites.value = true
  error.value = ''
  try {
    await $fetch(`/api/admin/partners/${editing.value.partnerId}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: { requisites: { ...editForm.value } },
    })
    success.value = 'Реквизиты сохранены'
    setTimeout(() => { success.value = '' }, 2000)
    closeEdit()
    await fetchPayouts()
  } catch (e) {
    error.value = e?.data?.error ?? 'Не удалось сохранить реквизиты'
  } finally {
    savingRequisites.value = false
  }
}

async function extractError(e, fallback) {
  const data = e?.data
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text())
      return parsed?.error ?? fallback
    } catch {
      return fallback
    }
  }
  return data?.error ?? fallback
}

function formatAmount(kopeks) {
  return `${(Number(kopeks ?? 0) / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`
}

function partnerLabel(partner) {
  return partner.requisites?.legalName || partner.name || `ID ${partner.partnerId.slice(-6)}`
}

function pointsLabel(partner) {
  if (!partner.points?.length) return '—'
  return partner.points.map((p) => p.name).join(', ')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <div class="mx-auto max-w-5xl">
      <div class="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">
            Выплаты партнёрам
          </h1>
          <p class="mt-1 text-sm text-gray-500">
            Реестр для Т-Бизнеса, отметка о выплате и отчёты агента
          </p>
        </div>
        <div class="flex gap-2">
          <NuxtLink
            to="/admin"
            class="rounded bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
          >
            Заказы
          </NuxtLink>
          <NuxtLink
            to="/admin/points"
            class="rounded bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
          >
            Точки
          </NuxtLink>
          <button
            class="rounded bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300 disabled:opacity-50"
            :disabled="loading || !adminSecret"
            @click="fetchPayouts"
          >
            Обновить
          </button>
        </div>
      </div>

      <div
        v-if="!adminSecret || error === 'Введите ADMIN_SECRET'"
        class="mb-6 rounded-lg border bg-white p-4"
      >
        <label class="mb-2 block text-sm font-medium text-gray-700">
          ADMIN_SECRET
        </label>
        <div class="flex gap-2">
          <input
            v-model="adminSecret"
            type="password"
            class="flex-1 rounded border px-3 py-2 text-sm"
            placeholder="Bearer secret"
            @keyup.enter="saveSecret"
          >
          <button
            class="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            @click="saveSecret"
          >
            Войти
          </button>
        </div>
      </div>

      <p
        v-if="error && error !== 'Введите ADMIN_SECRET'"
        class="mb-4 text-sm text-red-600"
      >
        {{ error }}
      </p>
      <p
        v-if="success"
        class="mb-4 text-sm text-green-600"
      >
        {{ success }}
      </p>

      <template v-if="adminSecret">
        <div class="mb-4 grid gap-3 rounded-lg border bg-white p-4 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-600">
              Период (в назначении платежа)
            </label>
            <input
              v-model="periodLabel"
              type="text"
              class="w-full rounded border px-3 py-2 text-sm"
              :placeholder="`напр. ${currentMonth}`"
            >
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-600">
              Месяц отчёта агента (ГГГГ-ММ)
            </label>
            <input
              v-model="reportMonth"
              type="month"
              class="w-full rounded border px-3 py-2 text-sm"
            >
          </div>
        </div>

        <div class="mb-4 flex flex-wrap items-center gap-2 rounded-lg border bg-white p-3">
          <span class="text-sm text-gray-600">
            Выбрано: {{ selectedIds.length }} · {{ formatAmount(selectedTotalKopeks) }}
          </span>
          <div class="ml-auto flex flex-wrap gap-2">
            <button
              class="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              :disabled="downloading || selectedIds.length === 0"
              @click="downloadRegistry('txt')"
            >
              {{ downloading === 'txt' ? '...' : 'Реестр TXT' }}
            </button>
            <button
              class="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              :disabled="downloading || selectedIds.length === 0"
              @click="downloadRegistry('1c')"
            >
              {{ downloading === '1c' ? '...' : 'Реестр 1С' }}
            </button>
            <button
              class="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              :disabled="downloading || selectedIds.length === 0"
              @click="downloadRegistry('xml')"
            >
              {{ downloading === 'xml' ? '...' : 'Реестр XML' }}
            </button>
            <button
              class="rounded bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700 disabled:opacity-50"
              :disabled="markingPaid || selectedIds.length === 0"
              @click="markPaid"
            >
              {{ markingPaid ? '...' : 'Отметить выплачено' }}
            </button>
          </div>
        </div>

        <div class="overflow-hidden rounded-lg border bg-white">
          <table class="min-w-full text-sm">
            <thead class="bg-gray-100 text-left text-gray-600">
              <tr>
                <th class="px-4 py-3">
                  <input
                    type="checkbox"
                    :checked="allSelected"
                    @change="toggleAll"
                  >
                </th>
                <th class="px-4 py-3">
                  Партнёр
                </th>
                <th class="px-4 py-3">
                  Точки
                </th>
                <th class="px-4 py-3">
                  Баланс
                </th>
                <th class="px-4 py-3">
                  Реквизиты
                </th>
                <th class="px-4 py-3">
                  Отчёт
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="partner in partners"
                :key="partner.partnerId"
                class="border-t"
              >
                <td class="px-4 py-3">
                  <input
                    type="checkbox"
                    :checked="selected.has(partner.partnerId)"
                    @change="toggleOne(partner.partnerId)"
                  >
                </td>
                <td class="px-4 py-3 font-medium text-gray-900">
                  {{ partnerLabel(partner) }}
                </td>
                <td class="px-4 py-3 text-gray-600">
                  {{ pointsLabel(partner) }}
                </td>
                <td class="px-4 py-3 font-semibold">
                  {{ formatAmount(partner.balanceKopeks) }}
                </td>
                <td class="px-4 py-3">
                  <span
                    v-if="partner.requisitesComplete"
                    class="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs text-green-800"
                  >
                    OK
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-800"
                  >
                    Не заполнены
                  </span>
                  <button
                    class="ml-2 text-xs text-blue-600 hover:underline"
                    @click="openEdit(partner)"
                  >
                    Изменить
                  </button>
                </td>
                <td class="px-4 py-3">
                  <button
                    class="rounded bg-gray-200 px-3 py-1 text-xs hover:bg-gray-300 disabled:opacity-50"
                    :disabled="reportingId === partner.partnerId"
                    @click="downloadReport(partner)"
                  >
                    {{ reportingId === partner.partnerId ? '...' : 'PDF' }}
                  </button>
                </td>
              </tr>
              <tr v-if="!loading && partners.length === 0">
                <td
                  colspan="6"
                  class="px-4 py-8 text-center text-gray-500"
                >
                  Нет партнёров с балансом к выплате
                </td>
              </tr>
              <tr v-if="loading">
                <td
                  colspan="6"
                  class="px-4 py-8 text-center text-gray-500"
                >
                  Загрузка...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <div
        v-if="editing"
        class="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4"
        @click.self="closeEdit"
      >
        <div class="w-full max-w-md rounded-lg bg-white p-5">
          <h2 class="mb-4 text-lg font-semibold text-gray-900">
            Реквизиты — {{ partnerLabel(editing) }}
          </h2>
          <div class="space-y-3">
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-600">Название (ИП / ООО)</label>
              <input
                v-model="editForm.legalName"
                type="text"
                class="w-full rounded border px-3 py-2 text-sm"
                placeholder="ИП Иванов Иван Иванович"
              >
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-600">ИНН (10 или 12 цифр)</label>
              <input
                v-model="editForm.inn"
                type="text"
                inputmode="numeric"
                class="w-full rounded border px-3 py-2 text-sm"
              >
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-600">Расчётный счёт (20 цифр)</label>
              <input
                v-model="editForm.accountNumber"
                type="text"
                inputmode="numeric"
                class="w-full rounded border px-3 py-2 text-sm"
              >
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-600">БИК (9 цифр)</label>
              <input
                v-model="editForm.bik"
                type="text"
                inputmode="numeric"
                class="w-full rounded border px-3 py-2 text-sm"
              >
            </div>
          </div>
          <div class="mt-5 flex justify-end gap-2">
            <button
              class="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300"
              @click="closeEdit"
            >
              Отмена
            </button>
            <button
              class="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              :disabled="savingRequisites"
              @click="saveRequisites"
            >
              {{ savingRequisites ? '...' : 'Сохранить' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
