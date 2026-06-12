<script setup>
const adminSecret = ref('')
const orders = ref([])
const loading = ref(false)
const error = ref('')
const payingId = ref(null)

useHead({
  meta: [{ name: 'robots', content: 'noindex' }],
})

let refreshTimer = null

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

async function fetchOrders() {
  if (!adminSecret.value) return
  loading.value = true
  error.value = ''
  try {
    const data = await $fetch('/api/admin/orders', {
      query: { status: 'AWAITING_PAYMENT' },
      headers: { Authorization: `Bearer ${adminSecret.value}` },
    })
    orders.value = data.orders
  } catch (e) {
    error.value = e?.data?.error ?? 'Ошибка загрузки заказов'
    orders.value = []
  } finally {
    loading.value = false
  }
}

async function payOrder(orderId) {
  if (!adminSecret.value || payingId.value) return
  payingId.value = orderId
  error.value = ''
  try {
    await $fetch(`/api/admin/orders/${orderId}/pay`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminSecret.value}` },
    })
    await fetchOrders()
  } catch (e) {
    error.value = e?.data?.error ?? 'Не удалось подтвердить оплату'
  } finally {
    payingId.value = null
  }
}

function formatUser(user) {
  if (user.username) return `@${user.username}`
  if (user.firstName) return user.firstName
  return user.telegramId
}

</script>

<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <div class="mx-auto max-w-5xl">
      <div class="mb-6 flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">
          Kopir Admin
        </h1>
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
                {{ formatUser(order.user) }}
              </td>
              <td class="px-4 py-3">
                {{ order.point.name }}
              </td>
              <td class="px-4 py-3 text-gray-500">
                {{ new Date(order.createdAt).toLocaleString('ru-RU') }}
              </td>
              <td class="px-4 py-3">
                Ожидает оплаты
              </td>
              <td class="px-4 py-3">
                <button
                  class="rounded bg-green-600 px-3 py-1 text-white hover:bg-green-700 disabled:opacity-50"
                  :disabled="payingId === order.id"
                  @click="payOrder(order.id)"
                >
                  {{ payingId === order.id ? '...' : 'Оплатить' }}
                </button>
              </td>
            </tr>
            <tr v-if="!loading && orders.length === 0 && adminSecret">
              <td
                colspan="7"
                class="px-4 py-8 text-center text-gray-500"
              >
                Нет заказов, ожидающих оплаты
              </td>
            </tr>
            <tr v-if="loading">
              <td
                colspan="7"
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
