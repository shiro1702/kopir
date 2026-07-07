<script setup>
const PAYMENT_METHODS = [
  { id: 'SBP_TRANSFER', label: 'Перевод' },
  { id: 'TBANK_SBP', label: 'СБП', needsTbank: true },
  { id: 'TBANK_ONLINE', label: 'Карта', needsTbank: true },
  { id: 'ON_SITE', label: 'На месте' },
]

const { adminSecret, saveSecret: persistAdminSecret, authHeaders, rememberOnSuccess } = useAdminAuth()

const points = ref([])
const loading = ref(!!adminSecret.value)
const error = ref('')
const success = ref('')
const showForm = ref(false)
const editingPoint = ref(null)
const saving = ref(false)
const tokenResult = ref(null)
const clientLinks = ref(null)
const clientLinksLoading = ref(false)
const posterDownloading = ref(false)
const tbankConfigured = ref(false)
const adminConfig = ref(null)

const form = ref({
  name: '',
  slug: '',
  displayCode: '',
  pricePerPageKopeks: 1000,
  commissionPercent: 25,
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
  if (adminSecret.value) {
    fetchPoints()
  }
  refreshTimer = setInterval(() => {
    if (adminSecret.value) fetchPoints()
  }, 15000)
})

onActivated(() => {
  if (adminSecret.value) fetchPoints()
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
  revokeClientLinkQrUrls()
})

function revokeClientLinkQrUrls() {
  const urls = clientLinks.value?.qrUrls
  if (!urls) return
  if (urls.telegram) URL.revokeObjectURL(urls.telegram)
  if (urls.max) URL.revokeObjectURL(urls.max)
}

function closeClientLinks() {
  revokeClientLinkQrUrls()
  clientLinks.value = null
}

function saveSecret() {
  const validationError = persistAdminSecret()
  if (validationError) {
    error.value = validationError
    return
  }
  error.value = ''
  fetchPoints()
}

function resetForm() {
  editingPoint.value = null
  form.value = {
    name: '',
    slug: '',
    displayCode: '',
    pricePerPageKopeks: 1000,
    commissionPercent: 25,
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
  closeClientLinks()
}

function openEdit(point) {
  editingPoint.value = point
  form.value = {
    name: point.name,
    slug: point.slug,
    displayCode: point.displayCode ?? '',
    pricePerPageKopeks: point.pricePerPageKopeks,
    commissionPercent: point.commissionPercent ?? 25,
    transferPhone: point.transferPhone ?? '',
    transferBankLabel: point.transferBankLabel ?? '',
    paymentMethodsEnabled: [...point.paymentMethodsEnabled],
    isActive: point.isActive,
  }
  showForm.value = true
  tokenResult.value = null
  closeClientLinks()
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
    rememberOnSuccess()
    points.value = data.points
    try {
      const config = await $fetch('/api/admin/config', { headers: authHeaders() })
      adminConfig.value = config
      tbankConfigured.value = config.tbankConfigured ?? false
    } catch {
      adminConfig.value = null
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
      displayCode: form.value.displayCode.trim() || null,
      pricePerPageKopeks: Number(form.value.pricePerPageKopeks),
      commissionPercent: Number(form.value.commissionPercent),
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

function isTbankMethod(method) {
  return method.needsTbank === true
}

function toggleMethod(methodId) {
  const methods = form.value.paymentMethodsEnabled
  if (methods.includes(methodId)) {
    form.value.paymentMethodsEnabled = methods.filter((m) => m !== methodId)
  } else {
    form.value.paymentMethodsEnabled = [...methods, methodId]
  }
}

async function generatePartnerToken(point) {
  tokenResult.value = null
  closeClientLinks()
  error.value = ''
  try {
    const data = await $fetch(`/api/admin/points/${point.id}/partner-token`, {
      method: 'POST',
      headers: authHeaders(),
    })
    tokenResult.value = { type: 'partner', pointName: point.name, ...data }
  } catch (e) {
    error.value = e?.data?.error ?? 'Не удалось создать ссылку для партнёра'
  }
}

async function generateBindToken(point) {
  tokenResult.value = null
  closeClientLinks()
  error.value = ''
  try {
    const data = await $fetch(`/api/admin/points/${point.id}/bind-token`, {
      method: 'POST',
      headers: authHeaders(),
    })
    tokenResult.value = { type: 'staff', pointName: point.name, ...data }
  } catch (e) {
    error.value = e?.data?.error ?? 'Не удалось создать ссылку для сотрудников'
  }
}

async function generateAgentToken(point) {
  tokenResult.value = null
  closeClientLinks()
  error.value = ''
  try {
    const data = await $fetch(`/api/admin/points/${point.id}/agent-token`, {
      method: 'POST',
      headers: authHeaders(),
    })
    tokenResult.value = { type: 'agent', pointName: point.name, ...data }
  } catch (e) {
    error.value = e?.data?.error ?? 'Не удалось создать токен программы печати'
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

function formatCommissionSplit(platformPercent) {
  const platform = Number(platformPercent ?? 30)
  return `${platform}% / ${100 - platform}%`
}

function agentIndicator(point) {
  return point.agentOnline ? '🟢' : '🔴'
}

function staffTelegramLink(result) {
  return result?.telegramDeepLink || result?.deepLink || null
}

async function openClientLinks(point) {
  if (!adminSecret.value || clientLinksLoading.value) return
  tokenResult.value = null
  closeClientLinks()
  clientLinksLoading.value = true
  error.value = ''
  try {
    const data = await $fetch(`/api/admin/points/${point.id}/links`, {
      headers: authHeaders(),
    })
    const qrUrls = {}
    if (data.links.telegramDeepLink) {
      const blob = await $fetch(`/api/admin/points/${point.id}/qr`, {
        headers: authHeaders(),
        query: { platform: 'telegram' },
        responseType: 'blob',
      })
      qrUrls.telegram = URL.createObjectURL(blob)
    }
    if (data.links.maxDeepLink) {
      const blob = await $fetch(`/api/admin/points/${point.id}/qr`, {
        headers: authHeaders(),
        query: { platform: 'max' },
        responseType: 'blob',
      })
      qrUrls.max = URL.createObjectURL(blob)
    }
    clientLinks.value = { ...data, qrUrls }
  } catch (e) {
    error.value = e?.data?.error ?? 'Не удалось загрузить ссылки точки'
  } finally {
    clientLinksLoading.value = false
  }
}

async function downloadPoster() {
  if (!clientLinks.value?.point?.id || posterDownloading.value) return
  posterDownloading.value = true
  error.value = ''
  try {
    const blob = await $fetch(`/api/admin/points/${clientLinks.value.point.id}/poster.pdf`, {
      headers: authHeaders(),
      responseType: 'blob',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `kopir-poster-${clientLinks.value.point.slug}.pdf`
    anchor.click()
    URL.revokeObjectURL(url)
    success.value = 'Плакат скачан'
    setTimeout(() => { success.value = '' }, 2000)
  } catch (e) {
    error.value = e?.data?.error ?? 'Не удалось скачать плакат'
  } finally {
    posterDownloading.value = false
  }
}

function telegramBotLabel() {
  const username = adminConfig.value?.telegramBotUsername
  return username ? `@${username}` : 'бота Kopir'
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
            Точки, уведомления сотрудникам и подключение программы печати
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
            to="/admin/payouts"
            class="rounded bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
          >
            Выплаты
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

      <PointClientLinksPanel
        v-if="clientLinks"
        :point="clientLinks.point"
        :links="clientLinks.links"
        :qr-urls="clientLinks.qrUrls"
        :admin-config="adminConfig"
        show-poster-download
        :poster-downloading="posterDownloading"
        @copy="copyText"
        @close="closeClientLinks"
        @download-poster="downloadPoster"
      />

      <div
        v-if="tokenResult?.type === 'staff'"
        class="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"
      >
        <p class="font-semibold">
          Привязка сотрудников — {{ tokenResult.pointName }}
        </p>
        <p class="mt-1 text-emerald-800">
          Ссылка действует до {{ formatDateTime(tokenResult.expiresAt) }} (одноразовая)
        </p>

        <div
          v-if="staffTelegramLink(tokenResult)"
          class="mt-4 rounded-md border border-emerald-200 bg-white p-3"
        >
          <p class="font-medium">
            Telegram — открыть бота
          </p>
          <p class="mt-1 text-xs text-gray-600">
            Ссылка сразу привяжет чат к точке «{{ tokenResult.pointName }}»
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            <a
              :href="staffTelegramLink(tokenResult)"
              target="_blank"
              rel="noopener noreferrer"
              class="rounded bg-[#229ED9] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a8bc4]"
            >
              Открыть в Telegram
            </a>
            <button
              class="rounded border border-emerald-300 bg-white px-3 py-2 text-xs hover:bg-emerald-50"
              @click="copyText(staffTelegramLink(tokenResult))"
            >
              Скопировать ссылку
            </button>
          </div>
        </div>
        <p
          v-else-if="adminConfig?.telegramConfigured"
          class="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
        >
          Задайте <code class="font-mono">TELEGRAM_BOT_USERNAME</code> в <code class="font-mono">web/.env</code>,
          чтобы появилась кнопка «Открыть в Telegram». Пока используйте команду ниже.
        </p>

        <div class="mt-4 space-y-3 rounded-md border border-emerald-200 bg-white p-3">
          <p class="font-medium">
            Как привязать группу с несколькими сотрудниками (Telegram)
          </p>
          <ol class="list-decimal space-y-1 pl-5 text-xs text-gray-700">
            <li>Создайте рабочий групповой чат или используйте существующий.</li>
            <li>Добавьте {{ telegramBotLabel() }} в группу.</li>
            <li>
              Администратор группы нажимает «Открыть в Telegram» на телефоне
              <span v-if="staffTelegramLink(tokenResult)">или отправляет в группу:</span>
              <span v-else>и отправляет в группу:</span>
            </li>
          </ol>
          <p
            v-if="tokenResult.bindCommand"
            class="rounded bg-gray-50 px-2 py-1.5 font-mono text-xs"
          >
            {{ tokenResult.bindCommand }}
          </p>
          <button
            v-if="tokenResult.bindCommand"
            class="rounded border border-emerald-300 bg-white px-3 py-1 text-xs hover:bg-emerald-50"
            @click="copyText(tokenResult.bindCommand)"
          >
            Скопировать команду для группы
          </button>
          <p class="text-xs text-gray-600">
            Все участники группы будут видеть уведомления о заказах этой точки.
            Для одного сотрудника достаточно открыть ссылку в личке.
          </p>
        </div>

        <div
          v-if="adminConfig?.maxConfigured"
          class="mt-4 rounded-md border border-emerald-200 bg-white p-3"
        >
          <p class="font-medium">
            MAX — только личка сотрудника
          </p>
          <p class="mt-1 text-xs text-gray-600">
            Откройте бота Kopir в MAX и отправьте:
          </p>
          <p class="mt-2 rounded bg-gray-50 px-2 py-1.5 font-mono text-xs">
            {{ tokenResult.maxBindCommand || tokenResult.bindCommand }}
          </p>
          <button
            class="mt-2 rounded border border-emerald-300 bg-white px-3 py-1 text-xs hover:bg-emerald-50"
            @click="copyText(tokenResult.maxBindCommand || tokenResult.bindCommand)"
          >
            Скопировать для MAX
          </button>
        </div>

        <button
          class="mt-4 text-xs text-emerald-700 underline hover:text-emerald-900"
          @click="tokenResult = null"
        >
          Закрыть
        </button>
      </div>

      <div
        v-else-if="tokenResult?.type === 'partner'"
        class="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
      >
        <p class="font-semibold">
          Привязка партнёра — {{ tokenResult.pointName }}
        </p>
        <p class="mt-1 text-amber-800">
          Ссылка действует до {{ formatDateTime(tokenResult.expiresAt) }} (одноразовая)
        </p>

        <div
          v-if="staffTelegramLink(tokenResult)"
          class="mt-4 rounded-md border border-amber-200 bg-white p-3"
        >
          <p class="font-medium">
            Telegram — открыть бота
          </p>
          <p class="mt-1 text-xs text-gray-600">
            Партнёр получит доступ к кабинету точки «{{ tokenResult.pointName }}»
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            <a
              :href="staffTelegramLink(tokenResult)"
              target="_blank"
              rel="noopener noreferrer"
              class="rounded bg-[#229ED9] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a8bc4]"
            >
              Открыть в Telegram
            </a>
            <button
              class="rounded border border-amber-300 bg-white px-3 py-2 text-xs hover:bg-amber-50"
              @click="copyText(staffTelegramLink(tokenResult))"
            >
              Скопировать ссылку
            </button>
          </div>
        </div>

        <div class="mt-4 space-y-3 rounded-md border border-amber-200 bg-white p-3">
          <p class="font-medium">
            Команда для партнёра
          </p>
          <p
            v-if="tokenResult.bindCommand"
            class="rounded bg-gray-50 px-2 py-1.5 font-mono text-xs"
          >
            {{ tokenResult.bindCommand }}
          </p>
          <button
            v-if="tokenResult.bindCommand"
            class="rounded border border-amber-300 bg-white px-3 py-1 text-xs hover:bg-amber-50"
            @click="copyText(tokenResult.bindCommand)"
          >
            Скопировать команду
          </button>
          <p class="text-xs text-gray-600">
            Партнёр увидит статус агента, заказы, настройки и баланс в боте.
          </p>
        </div>

        <div
          v-if="adminConfig?.maxConfigured"
          class="mt-4 rounded-md border border-amber-200 bg-white p-3"
        >
          <p class="font-medium">
            MAX
          </p>
          <p class="mt-1 text-xs text-gray-600">
            Откройте бота Kopir в MAX и отправьте:
          </p>
          <p class="mt-2 rounded bg-gray-50 px-2 py-1.5 font-mono text-xs">
            {{ tokenResult.maxBindCommand || tokenResult.bindCommand }}
          </p>
          <button
            class="mt-2 rounded border border-amber-300 bg-white px-3 py-1 text-xs hover:bg-amber-50"
            @click="copyText(tokenResult.maxBindCommand || tokenResult.bindCommand)"
          >
            Скопировать для MAX
          </button>
        </div>

        <button
          class="mt-4 text-xs text-amber-700 underline hover:text-amber-900"
          @click="tokenResult = null"
        >
          Закрыть
        </button>
      </div>

      <div
        v-else-if="tokenResult?.type === 'agent'"
        class="mb-4 rounded-lg border border-violet-200 bg-violet-50 p-4 text-sm text-violet-950"
      >
        <p class="font-semibold">
          Подключение программы печати — {{ tokenResult.pointName }}
        </p>
        <p class="mt-1 text-violet-800">
          Токен действует до {{ formatDateTime(tokenResult.expiresAt) }} (одноразовый)
        </p>
        <p class="mt-3 font-mono text-sm">
          {{ tokenResult.token }}
        </p>
        <div class="mt-4 space-y-2 rounded-md border border-violet-200 bg-white p-3 text-xs text-gray-700">
          <p class="font-medium text-sm text-gray-900">
            На ПК с принтером (Windows):
          </p>
          <ol class="list-decimal space-y-1 pl-5">
            <li>Откройте <code class="font-mono">desktop/.env</code></li>
            <li>Добавьте строку (без <code class="font-mono">POINT_ID</code>):</li>
          </ol>
          <p class="rounded bg-gray-50 px-2 py-1.5 font-mono">
            ACTIVATION_TOKEN={{ tokenResult.token }}
          </p>
          <ol
            start="3"
            class="list-decimal space-y-1 pl-5"
          >
            <li>Запустите агент: <code class="font-mono">python -m agent.main</code></li>
            <li>После успеха slug сохранится в <code class="font-mono">config.json</code> — токен можно удалить</li>
          </ol>
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          <button
            class="rounded bg-violet-600 px-3 py-1.5 text-xs text-white hover:bg-violet-700"
            @click="copyText(`ACTIVATION_TOKEN=${tokenResult.token}`)"
          >
            Скопировать для .env
          </button>
          <button
            class="rounded border border-violet-300 bg-white px-3 py-1.5 text-xs hover:bg-violet-50"
            @click="copyText(tokenResult.token)"
          >
            Скопировать токен
          </button>
        </div>
        <button
          class="mt-4 text-xs text-violet-700 underline hover:text-violet-900"
          @click="tokenResult = null"
        >
          Закрыть
        </button>
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
            <label class="mb-1 block text-sm text-gray-700">Код точки (для бота)</label>
            <input
              v-model="form.displayCode"
              class="w-full rounded border px-3 py-2 text-sm font-mono"
              placeholder="102"
            >
            <p class="mt-1 text-xs text-gray-500">
              Клиент может ввести код в чате или /start 102
            </p>
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
            <label class="mb-1 block text-sm text-gray-700">Комиссия платформы (%)</label>
            <input
              v-model.number="form.commissionPercent"
              type="number"
              min="0"
              max="99"
              class="w-full rounded border px-3 py-2 text-sm"
            >
            <p class="mt-1 text-xs text-gray-500">
              Платформа / партнёр: {{ formatCommissionSplit(form.commissionPercent) }}
              (при онлайн-оплате TBANK)
            </p>
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-700">Телефон для перевода</label>
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
                :class="isTbankMethod(method) && !tbankConfigured ? 'opacity-50' : ''"
                :title="isTbankMethod(method) && !tbankConfigured ? 'Задайте TBANK_TERMINAL_KEY и TBANK_PASSWORD' : ''"
              >
                <input
                  type="checkbox"
                  :checked="form.paymentMethodsEnabled.includes(method.id)"
                  :disabled="isTbankMethod(method) && !tbankConfigured"
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
                Печать
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
                Комиссия
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
                :title="point.lastSeenAt ? `Последний раз: ${formatDateTime(point.lastSeenAt)}` : 'Программа печати не подключалась'"
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
              <td
                class="px-4 py-3 text-xs"
                :title="`Платформа ${point.commissionPercent ?? 25}%, партнёру ${100 - (point.commissionPercent ?? 25)}%`"
              >
                {{ formatCommissionSplit(point.commissionPercent) }}
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
                    class="rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-800 hover:bg-emerald-100"
                    title="Привязать Telegram или MAX для уведомлений о заказах"
                    @click="generateBindToken(point)"
                  >
                    Сотрудники
                  </button>
                  <button
                    class="rounded bg-amber-50 px-2 py-1 text-xs text-amber-900 hover:bg-amber-100"
                    title="Привязать владельца точки к кабинету партнёра"
                    @click="generatePartnerToken(point)"
                  >
                    Партнёр
                  </button>
                  <button
                    class="rounded bg-violet-50 px-2 py-1 text-xs text-violet-800 hover:bg-violet-100"
                    title="Подключить программу печати на ПК с принтером"
                    @click="generateAgentToken(point)"
                  >
                    Программа печати
                  </button>
                  <button
                    class="rounded bg-sky-50 px-2 py-1 text-xs text-sky-900 hover:bg-sky-100 disabled:opacity-50"
                    title="QR и deep links для клиентов"
                    :disabled="clientLinksLoading"
                    @click="openClientLinks(point)"
                  >
                    Ссылка точки
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!loading && !points.length">
              <td
                colspan="7"
                class="px-4 py-8 text-center text-gray-500"
              >
                Нет точек. Создайте первую.
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
