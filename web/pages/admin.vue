<script setup>
const adminSecret = ref('')
const orders = ref([])
const adminConfig = ref(null)
const loading = ref(false)
const error = ref('')
const confirmingId = ref(null)
const printingId = ref(null)

useHead({
  meta: [{ name: 'robots', content: 'noindex' }],
})

let refreshTimer = null

const isTerminalMode = computed(() => adminConfig.value?.paymentMode === 'terminal')

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
        Тестовый режим «терминал»: клиент платит на терминале → сотрудник получает уведомление в Telegram
        (если настроены <code class="text-xs">STAFF_TELEGRAM_CHAT_ID</code> и/или
        <code class="text-xs">STAFF_MAX_USER_ID</code>) → «Оплата получена» → «Печать».
        Для онлайн-оплаты переключите <code class="text-xs">PAYMENT_MODE=online</code>.
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
            <tr
              v-for="order in orders"
              :key="order.id"
              class="border-t"
            >
              <td class="px-4 py-3 font-mono">
                #{{ order.shortId }}
              </td>
              <td class="px-4 py-3">
                {{ order.fileName }}
              </td>
              <td class="px-4 py-3">
                {{ formatPages(order.pageCount) }}
              </td>
              <td class="px-4 py-3">
                {{ formatAmount(order.amountKopeks) }}
              </td>
              <td class="px-4 py-3">
                {{ formatUser(order.user) }}
              </td>
              <td class="px-4 py-3">
                {{ order.point.name }}
              </td>
              <td class="px-4 py-3 text-gray-500">
                {{ new Date(order.createdAt).toLocaleString('ru-RU') }}
              </td>
              <td class="px-4 py-3">
                {{ orderStatusLabel(order) }}
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-col gap-1 sm:flex-row">
                  <button
                    v-if="isTerminalMode && !order.paymentConfirmedAt"
                    class="rounded bg-amber-500 px-3 py-1 text-white hover:bg-amber-600 disabled:opacity-50"
                    :disabled="confirmingId === order.id"
                    @click="confirmPayment(order.id)"
                  >
                    {{ confirmingId === order.id ? '...' : 'Оплата получена' }}
                  </button>
                  <button
                    class="rounded bg-green-600 px-3 py-1 text-white hover:bg-green-700 disabled:opacity-50"
                    :disabled="printingId === order.id || !canPrint(order)"
                    :title="!canPrint(order) ? 'Сначала подтвердите оплату' : ''"
                    @click="startPrint(order.id)"
                  >
                    {{ printingId === order.id ? '...' : 'Печать' }}
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!loading && orders.length === 0 && adminSecret">
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
