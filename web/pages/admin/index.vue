<script setup>
const ADMIN_TABS = [
  {
    id: 'payment',
    label: 'Ожидают оплаты',
    status: 'AWAITING_PAYMENT',
    emptyMessage: 'Нет заказов, ожидающих оплату',
  },
  {
    id: 'queue',
    label: 'Очередь печати',
    status: 'PAID,PRINTING',
    emptyMessage: 'Очередь печати пуста',
  },
  {
    id: 'history',
    label: 'История',
    status: 'PRINTED,FAILED',
    limit: 50,
    emptyMessage: 'Нет завершённых заказов',
  },
]

const { adminSecret, saveSecret: persistAdminSecret, authHeaders, rememberOnSuccess } = useAdminAuth()
const orders = ref([])
const adminConfig = ref(null)
const loading = ref(false)
const error = ref('')
const confirmingId = ref(null)
const printingId = ref(null)
const confirmingBatchId = ref(null)
const refundingId = ref(null)
const activeTab = ref('payment')

useHead({
  meta: [{ name: 'robots', content: 'noindex' }],
})

let refreshTimer = null

const isTerminalMode = computed(() => adminConfig.value?.paymentMode === 'terminal')
const isPaymentTab = computed(() => activeTab.value === 'payment')
const currentTab = computed(() => ADMIN_TABS.find((tab) => tab.id === activeTab.value) ?? ADMIN_TABS[0])

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
    const totalPages = sorted.reduce(
      (sum, o) => sum + (o.pageCount ?? 0) * (o.copies ?? 1),
      0,
    )
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

const flatOrders = computed(() => {
  if (isPaymentTab.value) {
    return []
  }

  const sorted = [...orders.value]
  if (activeTab.value === 'queue') {
    sorted.sort((a, b) => {
      const aPrimary = new Date(a.batchCreatedAt ?? a.paidAt ?? a.createdAt).getTime()
      const bPrimary = new Date(b.batchCreatedAt ?? b.paidAt ?? b.createdAt).getTime()
      if (aPrimary !== bPrimary) {
        return aPrimary - bPrimary
      }

      const indexDiff = (a.batchIndex ?? 0) - (b.batchIndex ?? 0)
      if (indexDiff !== 0) {
        return indexDiff
      }

      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
  }

  return sorted
})

onMounted(() => {
  const storedTab = localStorage.getItem('kopir_admin_tab')
  if (storedTab && ADMIN_TABS.some((tab) => tab.id === storedTab)) {
    activeTab.value = storedTab
  }
  if (adminSecret.value) {
    fetchOrders()
  }
  refreshTimer = setInterval(() => {
    if (adminSecret.value) fetchOrders()
  }, 10000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})

watch(activeTab, (tab) => {
  localStorage.setItem('kopir_admin_tab', tab)
  if (adminSecret.value) {
    fetchOrders()
  }
})

function saveSecret() {
  const validationError = persistAdminSecret()
  if (validationError) {
    error.value = validationError
    return
  }
  error.value = ''
  fetchOrders()
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
    const tab = currentTab.value
    const query = { status: tab.status }
    if (tab.limit) {
      query.limit = tab.limit
    }
    const data = await $fetch('/api/admin/orders', {
      query,
      headers: authHeaders(),
    })
    rememberOnSuccess()
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

function refundConfirmMessage(order) {
  if (order.batchId) {
    return 'Вернуть оплату пачки через Т-Банк?'
  }
  return 'Вернуть оплату через Т-Банк?'
}

async function refundPayment(order) {
  if (!adminSecret.value || refundingId.value) return
  if (!confirm(refundConfirmMessage(order))) return
  const orderId = order.id
  refundingId.value = orderId
  error.value = ''
  try {
    await $fetch(`/api/admin/orders/${orderId}/refund`, {
      method: 'POST',
      headers: authHeaders(),
    })
    await fetchOrders()
  } catch (e) {
    error.value = e?.data?.error ?? 'Не удалось выполнить возврат'
  } finally {
    refundingId.value = null
  }
}

function formatAmount(amountKopeks) {
  if (!amountKopeks) return '—'
  return `${Math.round(amountKopeks / 100)} ₽`
}

function formatPages(pageCount = null, copies = 1) {
  if (pageCount == null) {
    return '—'
  }
  if (copies > 1) {
    return `${pageCount}×${copies}`
  }
  return String(pageCount)
}

function formatUser(user) {
  if (!user) return '—'
  if (user.username) return `@${user.username}`
  if (user.firstName) return user.firstName
  if (user.telegramId) return `TG:${user.telegramId}`
  if (user.maxUserId) return `MAX:${user.maxUserId}`
  return '—'
}

function formatOrderRef(order) {
  if (order.batchId) {
    return `#${order.shortId} · пачка …${order.batchId.slice(-6)}`
  }
  return `#${order.shortId}`
}

function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('ru-RU')
}

function orderStatusLabel(order) {
  if (isPaymentTab.value) {
    if (order.paymentConfirmedAt) return 'Оплата принята'
    return 'Ждёт оплату на терминале'
  }

  const labels = {
    PAID: 'Ждёт агента',
    PRINTING: 'Печатается…',
    PRINTED: 'Напечатано',
    FAILED: 'Ошибка печати',
  }
  return labels[order.status] ?? order.status
}

function canPrint(order) {
  if (!isTerminalMode.value) return true
  return Boolean(order.paymentConfirmedAt)
}

function pointAgentIndicator(point) {
  if (!point) return '⚪'
  return point.agentOnline ? '🟢' : '🔴'
}

function pointAgentTitle(point) {
  if (!point) return 'Точка неизвестна'
  if (point.agentOnline) {
    return `Агент печати подключён (${point.name})`
  }
  if (point.lastSeenAt) {
    return `Агент печати не подключён (${point.name}). Последний контакт: ${formatDateTime(point.lastSeenAt)}`
  }
  return `Агент печати не подключён (${point.name}). Контактов ещё не было`
}

function formatPointCell(point) {
  if (!point) return '—'
  return `${pointAgentIndicator(point)} ${point.name}`
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
          <div
            v-if="adminConfig?.points?.length"
            class="mt-2 flex flex-wrap gap-2"
          >
            <span
              v-for="point in adminConfig.points"
              :key="point.slug"
              class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs"
              :class="point.agentOnline
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-red-200 bg-red-50 text-red-800'"
              :title="pointAgentTitle(point)"
            >
              <span aria-hidden="true">{{ pointAgentIndicator(point) }}</span>
              <span>{{ point.name }}</span>
              <span class="text-[11px] opacity-80">
                {{ point.agentOnline ? 'онлайн' : 'офлайн' }}
              </span>
            </span>
          </div>
        </div>
        <div class="flex gap-2">
          <NuxtLink
            to="/admin/points"
            class="rounded bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
          >
            Точки
          </NuxtLink>
          <NuxtLink
            to="/admin/payouts"
            class="rounded bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
          >
            Выплаты
          </NuxtLink>
          <button
            class="rounded bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300 disabled:opacity-50"
            :disabled="loading || !adminSecret"
            @click="fetchOrders"
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

      <div
        v-if="isTerminalMode && adminSecret && isPaymentTab"
        class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      >
        Тестовый режим «терминал»: клиент платит на терминале → сотрудник получает уведомление.
        Для пачки — одна кнопка «Оплатить пачку». Для одиночного заказа — «Оплата получена» → «Печать».
      </div>

      <div
        v-if="adminSecret"
        class="mb-4 flex gap-1 rounded-lg border bg-white p-1"
      >
        <button
          v-for="tab in ADMIN_TABS"
          :key="tab.id"
          class="rounded-md px-4 py-2 text-sm font-medium transition-colors"
          :class="activeTab === tab.id
            ? 'bg-blue-600 text-white'
            : 'text-gray-600 hover:bg-gray-100'"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
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
            <template v-if="isPaymentTab">
              <template
                v-for="group in displayGroups"
              >
                <tr
                  v-if="group.type === 'batch'"
                  :key="`${group.batchId}-batch`"
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
                  <td
                    class="px-4 py-3"
                    :title="pointAgentTitle(group.point)"
                  >
                    {{ formatPointCell(group.point) }}
                  </td>
                  <td class="px-4 py-3 text-gray-500">
                    {{ formatDateTime(group.createdAt) }}
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
                    {{ formatPages(order.pageCount, order.copies) }}
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
                  :key="group.order.id"
                  class="border-t"
                >
                  <td class="px-4 py-3 font-mono">
                    #{{ group.order.shortId }}
                  </td>
                  <td class="px-4 py-3">
                    {{ group.order.fileName }}
                  </td>
                  <td class="px-4 py-3">
                    {{ formatPages(group.order.pageCount, group.order.copies) }}
                  </td>
                  <td class="px-4 py-3">
                    {{ formatAmount(group.order.amountKopeks) }}
                  </td>
                  <td class="px-4 py-3">
                    {{ formatUser(group.order.user) }}
                  </td>
                  <td
                    class="px-4 py-3"
                    :title="pointAgentTitle(group.order.point)"
                  >
                    {{ formatPointCell(group.order.point) }}
                  </td>
                  <td class="px-4 py-3 text-gray-500">
                    {{ formatDateTime(group.order.createdAt) }}
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
            </template>

            <template v-else>
              <tr
                v-for="order in flatOrders"
                :key="order.id"
                class="border-t"
              >
                <td class="px-4 py-3 font-mono text-xs">
                  {{ formatOrderRef(order) }}
                </td>
                <td class="px-4 py-3">
                  {{ order.fileName }}
                </td>
                <td class="px-4 py-3">
                  {{ formatPages(order.pageCount, order.copies) }}
                </td>
                <td class="px-4 py-3">
                  {{ formatAmount(order.amountKopeks) }}
                </td>
                <td class="px-4 py-3">
                  {{ formatUser(order.user) }}
                </td>
                <td
                  class="px-4 py-3"
                  :title="pointAgentTitle(order.point)"
                >
                  {{ formatPointCell(order.point) }}
                </td>
                <td class="px-4 py-3 text-gray-500">
                  {{ formatDateTime(activeTab === 'history' ? (order.printedAt ?? order.createdAt) : (order.paidAt ?? order.createdAt)) }}
                </td>
                <td class="px-4 py-3">
                  <span>{{ orderStatusLabel(order) }}</span>
                  <span
                    v-if="order.paymentRefunded"
                    class="mt-0.5 block text-xs text-amber-700"
                  >
                    Возврат выполнен
                  </span>
                  <span
                    v-if="order.status === 'FAILED' && order.errorMessage"
                    class="mt-0.5 block text-xs text-red-600"
                  >
                    {{ order.errorMessage }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <button
                    v-if="order.canRefund"
                    class="rounded bg-rose-600 px-3 py-1 text-white hover:bg-rose-700 disabled:opacity-50"
                    :disabled="refundingId === order.id"
                    @click="refundPayment(order)"
                  >
                    {{ refundingId === order.id ? '...' : (order.batchId ? 'Возврат пачки' : 'Возврат') }}
                  </button>
                </td>
              </tr>
            </template>

            <tr v-if="!loading && isPaymentTab && displayGroups.length === 0 && adminSecret">
              <td
                colspan="9"
                class="px-4 py-8 text-center text-gray-500"
              >
                {{ currentTab.emptyMessage }}
              </td>
            </tr>
            <tr v-if="!loading && !isPaymentTab && flatOrders.length === 0 && adminSecret">
              <td
                colspan="9"
                class="px-4 py-8 text-center text-gray-500"
              >
                {{ currentTab.emptyMessage }}
              </td>
            </tr>
            <tr v-if="loading">
              <td
                :colspan="isPaymentTab ? 9 : 9"
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
