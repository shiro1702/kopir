<script setup>
const adminSecret = ref('')
const orders = ref([])
const adminConfig = ref(null)
const loading = ref(false)
const error = ref('')
const confirmingId = ref(null)
const printingId = ref(null)
const confirmingBatchId = ref(null)

useHead({
  meta: [{ name: 'robots', content: 'noindex' }],
})

let refreshTimer = null

const isTerminalMode = computed(() => adminConfig.value?.paymentMode === 'terminal')

const displayGroups = computed(() => {
  const singles = []
  const batchMap = new Map()

  for (const order of orders.value) {
    if (!order.batchId) {
      singles.push({ type: 'single', order })
      continue
    }
    if (!batchMap.has(order.batchId)) {
      batchMap.set(order.batchId, [])
    }
    batchMap.get(order.batchId).push(order)
  }

  const batches = [...batchMap.entries()].map(([batchId, batchOrders]) => {
    const sorted = [...batchOrders].sort((a, b) => (a.batchIndex ?? 0) - (b.batchIndex ?? 0))
    const totalPages = sorted.reduce((sum, o) => sum + (o.pageCount ?? 0), 0)
    const totalAmountKopeks = sorted.reduce((sum, o) => sum + (o.amountKopeks ?? 0), 0)
    return {
      type: 'batch',
      batchId,
      shortId: batchId.slice(-6),
      orders: sorted,
      totalPages,
      totalAmountKopeks,
      user: sorted[0]?.user,
      point: sorted[0]?.point,
      createdAt: sorted[0]?.createdAt,
    }
  })

  return [...batches, ...singles.map((s) => ({ ...s, key: s.order.id }))]
    .map((item) => ({
      ...item,
      key: item.type === 'batch' ? item.batchId : item.order.id,
    }))
    .sort((a, b) => {
      const aTime = new Date(a.type === 'batch' ? a.createdAt : a.order.createdAt).getTime()
      const bTime = new Date(b.type === 'batch' ? b.createdAt : b.order.createdAt).getTime()
      return bTime - aTime
    })
})

onMounted(() => {
  const stored = localStorage.getItem('kopir_admin_secret')
  if (stored) {
    adminSecret.value = stored
    fetchOrders()
  }
  refreshTimer = setInterval(() => {
    if (adminSecret.value) fetchOrders()
  }, 10000)
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
  fetchOrders()
}

function authHeaders() {
  return { Authorization: `Bearer ${adminSecret.value}` }
}

async function fetchAdminConfig() {
  try {
    adminConfig.value = await $fetch('/api/admin/config', { headers: authHeaders() })
  } catch {
    adminConfig.value = null
  }
}

async function fetchOrders() {
  if (!adminSecret.value) return
  loading.value = true
  error.value = ''
  try {
    await fetchAdminConfig()
    const data = await $fetch('/api/admin/orders', {
      query: { status: 'AWAITING_PAYMENT' },
      headers: authHeaders(),
    })
    orders.value = data.orders
  } catch (e) {
    error.value = e?.data?.error ?? 'Ошибка загрузки заказов'
    orders.value = []
  } finally {
    loading.value = false
  }
}

async function confirmPayment(orderId) {
  if (!adminSecret.value || confirmingId.value) return
  confirmingId.value = orderId
  error.value = ''
  try {
    await $fetch(`/api/admin/orders/${orderId}/confirm-payment`, {
      method: 'POST',
      headers: authHeaders(),
    })
    await fetchOrders()
  } catch (e) {
    error.value = e?.data?.error ?? 'Не удалось подтвердить оплату'
  } finally {
    confirmingId.value = null
  }
}

async function confirmBatchPayment(batchId) {
  if (!adminSecret.value || confirmingBatchId.value) return
  confirmingBatchId.value = batchId
  error.value = ''
  try {
    await $fetch(`/api/admin/batches/${batchId}/confirm-payment`, {
      method: 'POST',
      headers: authHeaders(),
    })
    await fetchOrders()
  } catch (e) {
    error.value = e?.data?.error ?? 'Не удалось подтвердить оплату пачки'
  } finally {
    confirmingBatchId.value = null
  }
}

async function startPrint(orderId) {
  if (!adminSecret.value || printingId.value) return
  printingId.value = orderId
  error.value = ''
  try {
    await $fetch(`/api/admin/orders/${orderId}/print`, {
      method: 'POST',
      headers: authHeaders(),
    })
    await fetchOrders()
  } catch (e) {
    error.value = e?.data?.error ?? 'Не удалось запустить печать'
  } finally {
    printingId.value = null
  }
}

function formatAmount(amountKopeks) {
  if (!amountKopeks) return '—'
  return `${Math.round(amountKopeks / 100)} ₽`
}

function formatPages(pageCount) {
  return pageCount ?? '—'
}

function formatUser(user) {
  if (!user) return '—'
  if (user.username) return `@${user.username}`
  if (user.firstName) return user.firstName
  if (user.telegramId) return `TG:${user.telegramId}`
  if (user.maxUserId) return `MAX:${user.maxUserId}`
  return '—'
}

function orderStatusLabel(order) {
  if (order.paymentConfirmedAt) return 'Оплата принята'
  return 'Ждёт оплату на терминале'
}

function canPrint(order) {
  if (!isTerminalMode.value) return true
  return Boolean(order.paymentConfirmedAt)
}

</script>

<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <div class="mx-auto max-w-5xl">
      <div class="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">
            Kopir Admin
          </h1>
          <p
            v-if="adminConfig"
            class="mt-1 text-sm text-gray-500"
          >
            Режим оплаты: {{ adminConfig.paymentModeLabel }}
            <span v-if="adminConfig.staffTelegramConfigured"> · TG-сотрудник</span>
            <span v-if="adminConfig.staffMaxConfigured"> · MAX-сотрудник</span>
          </p>
        </div>
        <button
          class="rounded bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300 disabled:opacity-50"
          :disabled="loading || !adminSecret"
          @click="fetchOrders"
        >
          Обновить
        </button>
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

      <div
        v-if="isTerminalMode && adminSecret"
        class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      >
        Тестовый режим «терминал»: клиент платит на терминале → сотрудник получает уведомление.
        Для пачки — одна кнопка «Оплатить пачку». Для одиночного заказа — «Оплата получена» → «Печать».
      </div>

      <div class="overflow-hidden rounded-lg border bg-white">
        <table class="min-w-full text-sm">
          <thead class="bg-gray-100 text-left text-gray-600">
            <tr>
              <th class="px-4 py-3">
                Заказ
              </th>
              <th class="px-4 py-3">
                Файл
              </th>
              <th class="px-4 py-3">
                Страниц
              </th>
              <th class="px-4 py-3">
                Сумма
              </th>
              <th class="px-4 py-3">
                Пользователь
              </th>
              <th class="px-4 py-3">
                Точка
              </th>
              <th class="px-4 py-3">
                Дата
              </th>
              <th class="px-4 py-3">
                Статус
              </th>
              <th class="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            <template
              v-for="group in displayGroups"
              :key="group.key"
            >
              <tr
                v-if="group.type === 'batch'"
                class="border-t bg-blue-50"
              >
                <td
                  class="px-4 py-3 font-mono font-semibold"
                  colspan="2"
                >
                  📦 Пачка #{{ group.shortId }} ({{ group.orders.length }} файлов)
                </td>
                <td class="px-4 py-3 font-semibold">
                  {{ formatPages(group.totalPages) }}
                </td>
                <td class="px-4 py-3 font-semibold">
                  {{ formatAmount(group.totalAmountKopeks) }}
                </td>
                <td class="px-4 py-3">
                  {{ formatUser(group.user) }}
                </td>
                <td class="px-4 py-3">
                  {{ group.point?.name }}
                </td>
                <td class="px-4 py-3 text-gray-500">
                  {{ new Date(group.createdAt).toLocaleString('ru-RU') }}
                </td>
                <td class="px-4 py-3">
                  Ждёт оплату
                </td>
                <td class="px-4 py-3">
                  <button
                    class="rounded bg-green-600 px-3 py-1 text-white hover:bg-green-700 disabled:opacity-50"
                    :disabled="confirmingBatchId === group.batchId"
                    @click="confirmBatchPayment(group.batchId)"
                  >
                    {{ confirmingBatchId === group.batchId ? '...' : 'Оплатить пачку' }}
                  </button>
                </td>
              </tr>
              <tr
                v-for="order in group.type === 'batch' ? group.orders : []"
                :key="order.id"
                class="border-t bg-gray-50 text-gray-600"
              >
                <td class="px-4 py-2 pl-8 font-mono text-xs">
                  {{ order.batchIndex }}.
                </td>
                <td class="px-4 py-2">
                  {{ order.fileName }}
                </td>
                <td class="px-4 py-2">
                  {{ formatPages(order.pageCount) }}
                </td>
                <td class="px-4 py-2">
                  {{ formatAmount(order.amountKopeks) }}
                </td>
                <td
                  class="px-4 py-2"
                  colspan="4"
                />
              </tr>

              <tr
                v-if="group.type === 'single'"
                class="border-t"
              >
                <td class="px-4 py-3 font-mono">
                  #{{ group.order.shortId }}
                </td>
                <td class="px-4 py-3">
                  {{ group.order.fileName }}
                </td>
                <td class="px-4 py-3">
                  {{ formatPages(group.order.pageCount) }}
                </td>
                <td class="px-4 py-3">
                  {{ formatAmount(group.order.amountKopeks) }}
                </td>
                <td class="px-4 py-3">
                  {{ formatUser(group.order.user) }}
                </td>
                <td class="px-4 py-3">
                  {{ group.order.point.name }}
                </td>
                <td class="px-4 py-3 text-gray-500">
                  {{ new Date(group.order.createdAt).toLocaleString('ru-RU') }}
                </td>
                <td class="px-4 py-3">
                  {{ orderStatusLabel(group.order) }}
                </td>
                <td class="px-4 py-3">
                  <div class="flex flex-col gap-1 sm:flex-row">
                    <button
                      v-if="isTerminalMode && !group.order.paymentConfirmedAt"
                      class="rounded bg-amber-500 px-3 py-1 text-white hover:bg-amber-600 disabled:opacity-50"
                      :disabled="confirmingId === group.order.id"
                      @click="confirmPayment(group.order.id)"
                    >
                      {{ confirmingId === group.order.id ? '...' : 'Оплата получена' }}
                    </button>
                    <button
                      class="rounded bg-green-600 px-3 py-1 text-white hover:bg-green-700 disabled:opacity-50"
                      :disabled="printingId === group.order.id || !canPrint(group.order)"
                      :title="!canPrint(group.order) ? 'Сначала подтвердите оплату' : ''"
                      @click="startPrint(group.order.id)"
                    >
                      {{ printingId === group.order.id ? '...' : 'Печать' }}
                    </button>
                  </div>
                </td>
              </tr>
            </template>
            <tr v-if="!loading && displayGroups.length === 0 && adminSecret">
              <td
                colspan="9"
                class="px-4 py-8 text-center text-gray-500"
              >
                Нет заказов, ожидающих печати
              </td>
            </tr>
            <tr v-if="loading">
              <td
                colspan="9"
                class="px-4 py-8 text-center text-gray-500"
              >
                Загрузка...
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
