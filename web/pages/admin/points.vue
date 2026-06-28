<script setup>
const PAYMENT_METHODS = [
  { id: 'SBP_TRANSFER', label: 'Перевод СБП' },
  { id: 'ON_SITE', label: 'На месте' },
  { id: 'TBANK_ONLINE', label: 'Онлайн (Т-Банк)' },
]

const adminSecret = ref('')
const points = ref([])
const loading = ref(false)
const error = ref('')
const success = ref('')
const showForm = ref(false)
const editingPoint = ref(null)
const saving = ref(false)
const tokenResult = ref(null)
const tbankConfigured = ref(false)

const form = ref({
  name: '',
  slug: '',
  pricePerPageKopeks: 1000,
  transferPhone: '',
  transferBankLabel: '',
  paymentMethodsEnabled: ['SBP_TRANSFER', 'ON_SITE'],
  isActive: true,
})

useHead({
  meta: [{ name: 'robots', content: 'noindex' }],
})

let refreshTimer = null

onMounted(() => {
  const storedSecret = localStorage.getItem('kopir_admin_secret')
  if (storedSecret) {
    adminSecret.value = storedSecret
    fetchPoints()
  }
  refreshTimer = setInterval(() => {
    if (adminSecret.value) fetchPoints()
  }, 15000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})

function saveSecret() {
  if (!adminSecret.value.trim()) {
    error.value = 'Введите ADMIN_SECRET'
    return
  }
  localStorage.setItem('kopir_admin_secret', adminSecret.value.trim())
  error.value = ''
  fetchPoints()
}

function authHeaders() {
  return { Authorization: `Bearer ${adminSecret.value}` }
}

function resetForm() {
  editingPoint.value = null
  form.value = {
    name: '',
    slug: '',
    pricePerPageKopeks: 1000,
    transferPhone: '',
    transferBankLabel: '',
    paymentMethodsEnabled: ['SBP_TRANSFER', 'ON_SITE'],
    isActive: true,
  }
}

function openCreate() {
  resetForm()
  showForm.value = true
  tokenResult.value = null
}

function openEdit(point) {
  editingPoint.value = point
  form.value = {
    name: point.name,
    slug: point.slug,
    pricePerPageKopeks: point.pricePerPageKopeks,
    transferPhone: point.transferPhone ?? '',
    transferBankLabel: point.transferBankLabel ?? '',
    paymentMethodsEnabled: [...point.paymentMethodsEnabled],
    isActive: point.isActive,
  }
  showForm.value = true
  tokenResult.value = null
}

function closeForm() {
  showForm.value = false
  resetForm()
}

async function fetchPoints() {
  if (!adminSecret.value) return
  loading.value = true
  error.value = ''
  try {
    const data = await $fetch('/api/admin/points', { headers: authHeaders() })
    points.value = data.points
    try {
      const config = await $fetch('/api/admin/config', { headers: authHeaders() })
      tbankConfigured.value = config.tbankConfigured ?? false
    } catch {
      tbankConfigured.value = false
    }
  } catch (e) {
    error.value = e?.data?.error ?? 'Ошибка загрузки точек'
    points.value = []
  } finally {
    loading.value = false
  }
}

async function savePoint() {
  if (!adminSecret.value || saving.value) return
  saving.value = true
  error.value = ''
  success.value = ''
  try {
    const payload = {
      name: form.value.name.trim(),
      slug: form.value.slug.trim(),
      pricePerPageKopeks: Number(form.value.pricePerPageKopeks),
      transferPhone: form.value.transferPhone.trim() || null,
      transferBankLabel: form.value.transferBankLabel.trim() || null,
      paymentMethodsEnabled: form.value.paymentMethodsEnabled,
      isActive: form.value.isActive,
    }
    if (editingPoint.value) {
      await $fetch(`/api/admin/points/${editingPoint.value.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: payload,
      })
      success.value = 'Точка обновлена'
    } else {
      await $fetch('/api/admin/points', {
        method: 'POST',
        headers: authHeaders(),
        body: payload,
      })
      success.value = 'Точка создана'
    }
    closeForm()
    await fetchPoints()
  } catch (e) {
    error.value = e?.data?.error ?? 'Не удалось сохранить точку'
  } finally {
    saving.value = false
  }
}

function toggleMethod(methodId) {
  const methods = form.value.paymentMethodsEnabled
  if (methods.includes(methodId)) {
    form.value.paymentMethodsEnabled = methods.filter((m) => m !== methodId)
  } else {
    form.value.paymentMethodsEnabled = [...methods, methodId]
  }
}

async function generateBindToken(point) {
  tokenResult.value = null
  error.value = ''
  try {
    const data = await $fetch(`/api/admin/points/${point.id}/bind-token`, {
      method: 'POST',
      headers: authHeaders(),
    })
    tokenResult.value = { type: 'bind', pointName: point.name, ...data }
  } catch (e) {
    error.value = e?.data?.error ?? 'Не удалось создать bind-токен'
  }
}

async function generateAgentToken(point) {
  tokenResult.value = null
  error.value = ''
  try {
    const data = await $fetch(`/api/admin/points/${point.id}/agent-token`, {
      method: 'POST',
      headers: authHeaders(),
    })
    tokenResult.value = { type: 'agent', pointName: point.name, ...data }
  } catch (e) {
    error.value = e?.data?.error ?? 'Не удалось создать токен агента'
  }
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    success.value = 'Скопировано'
    setTimeout(() => { success.value = '' }, 2000)
  } catch {
    error.value = 'Не удалось скопировать'
  }
}

function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('ru-RU')
}

function formatPrice(kopeks) {
  return `${(kopeks / 100).toFixed(2)} ₽`
}

function agentIndicator(point) {
  return point.agentOnline ? '🟢' : '🔴'
}

function clientDeepLink(slug) {
  return `?start=${slug}`
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <div class="mx-auto max-w-5xl">
      <div class="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">
            Точки печати
          </h1>
          <p class="mt-1 text-sm text-gray-500">
            Управление точками, staff bind и активация агента
          </p>
        </div>
        <div class="flex gap-2">
          <NuxtLink
            to="/admin"
            class="rounded bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
          >
            Заказы
          </NuxtLink>
          <button
            class="rounded bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300 disabled:opacity-50"
            :disabled="loading || !adminSecret"
            @click="fetchPoints"
          >
            Обновить
          </button>
          <button
            v-if="adminSecret"
            class="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
            @click="openCreate"
          >
            + Точка
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

      <div
        v-if="tokenResult"
        class="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm"
      >
        <p class="font-medium text-blue-900">
          {{ tokenResult.type === 'bind' ? 'Bind-токен' : 'Токен агента' }} — {{ tokenResult.pointName }}
        </p>
        <p class="mt-2 font-mono text-blue-800">
          {{ tokenResult.token }}
        </p>
        <p class="mt-1 text-blue-700">
          Действует до: {{ formatDateTime(tokenResult.expiresAt) }}
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <button
            class="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
            @click="copyText(tokenResult.token)"
          >
            Копировать токен
          </button>
          <button
            v-if="tokenResult.bindCommand"
            class="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
            @click="copyText(tokenResult.bindCommand)"
          >
            Копировать /bind
          </button>
          <button
            v-if="tokenResult.deepLink"
            class="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
            @click="copyText(tokenResult.deepLink)"
          >
            Копировать deep link
          </button>
        </div>
      </div>

      <div
        v-if="showForm"
        class="mb-6 rounded-lg border bg-white p-4"
      >
        <h2 class="mb-4 text-lg font-semibold">
          {{ editingPoint ? 'Редактировать точку' : 'Новая точка' }}
        </h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm text-gray-700">Название</label>
            <input
              v-model="form.name"
              class="w-full rounded border px-3 py-2 text-sm"
            >
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-700">Slug</label>
            <input
              v-model="form.slug"
              class="w-full rounded border px-3 py-2 text-sm font-mono"
              placeholder="point_bgu_1"
            >
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-700">Цена за страницу (коп.)</label>
            <input
              v-model.number="form.pricePerPageKopeks"
              type="number"
              min="1"
              class="w-full rounded border px-3 py-2 text-sm"
            >
            <p class="mt-1 text-xs text-gray-500">
              {{ formatPrice(form.pricePerPageKopeks) }} за стр.
            </p>
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-700">Телефон СБП</label>
            <input
              v-model="form.transferPhone"
              class="w-full rounded border px-3 py-2 text-sm"
              placeholder="+79001234567"
            >
          </div>
          <div class="sm:col-span-2">
            <label class="mb-1 block text-sm text-gray-700">Банк (подпись)</label>
            <input
              v-model="form.transferBankLabel"
              class="w-full rounded border px-3 py-2 text-sm"
              placeholder="Т-Банк"
            >
          </div>
          <div class="sm:col-span-2">
            <label class="mb-2 block text-sm text-gray-700">Способы оплаты</label>
            <div class="flex flex-wrap gap-3">
              <label
                v-for="method in PAYMENT_METHODS"
                :key="method.id"
                class="flex items-center gap-2 text-sm"
                :class="method.id === 'TBANK_ONLINE' && !tbankConfigured ? 'opacity-50' : ''"
                :title="method.id === 'TBANK_ONLINE' && !tbankConfigured ? 'Задайте TBANK_TERMINAL_KEY и TBANK_PASSWORD' : ''"
              >
                <input
                  type="checkbox"
                  :checked="form.paymentMethodsEnabled.includes(method.id)"
                  :disabled="method.id === 'TBANK_ONLINE' && !tbankConfigured"
                  @change="toggleMethod(method.id)"
                >
                {{ method.label }}
              </label>
            </div>
          </div>
          <div
            v-if="editingPoint"
            class="sm:col-span-2"
          >
            <label class="flex items-center gap-2 text-sm">
              <input
                v-model="form.isActive"
                type="checkbox"
              >
              Точка активна
            </label>
          </div>
        </div>
        <div class="mt-4 flex gap-2">
          <button
            class="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            :disabled="saving"
            @click="savePoint"
          >
            {{ saving ? 'Сохранение…' : 'Сохранить' }}
          </button>
          <button
            class="rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300"
            @click="closeForm"
          >
            Отмена
          </button>
        </div>
      </div>

      <div
        v-if="adminSecret"
        class="overflow-hidden rounded-lg border bg-white"
      >
        <table class="min-w-full text-sm">
          <thead class="bg-gray-100 text-left text-gray-600">
            <tr>
              <th class="px-4 py-3">
                Агент
              </th>
              <th class="px-4 py-3">
                Slug
              </th>
              <th class="px-4 py-3">
                Название
              </th>
              <th class="px-4 py-3">
                Цена
              </th>
              <th class="px-4 py-3">
                Статус
              </th>
              <th class="px-4 py-3">
                Действия
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="point in points"
              :key="point.id"
              class="border-t"
            >
              <td
                class="px-4 py-3"
                :title="point.lastSeenAt ? `Последний раз: ${formatDateTime(point.lastSeenAt)}` : 'Агент не подключался'"
              >
                {{ agentIndicator(point) }}
              </td>
              <td class="px-4 py-3 font-mono text-xs">
                {{ point.slug }}
              </td>
              <td class="px-4 py-3">
                {{ point.name }}
              </td>
              <td class="px-4 py-3">
                {{ formatPrice(point.pricePerPageKopeks) }}
              </td>
              <td class="px-4 py-3">
                <span
                  class="rounded-full px-2 py-0.5 text-xs"
                  :class="point.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'"
                >
                  {{ point.isActive ? 'активна' : 'выкл' }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap gap-1">
                  <button
                    class="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200"
                    @click="openEdit(point)"
                  >
                    Изменить
                  </button>
                  <button
                    class="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200"
                    title="Токен для /bind staff"
                    @click="generateBindToken(point)"
                  >
                    Bind
                  </button>
                  <button
                    class="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200"
                    title="Токен активации агента"
                    @click="generateAgentToken(point)"
                  >
                    Агент
                  </button>
                  <button
                    class="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200"
                    :title="`Клиентский deep link: ${clientDeepLink(point.slug)}`"
                    @click="copyText(clientDeepLink(point.slug))"
                  >
                    QR link
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!points.length && !loading">
              <td
                colspan="6"
                class="px-4 py-8 text-center text-gray-500"
              >
                Нет точек. Создайте первую.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
