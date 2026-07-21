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
const bindingsPanel = ref(null)
const unbindingStaffId = ref(null)
const unbindingPartner = ref(false)
const partnerRequisitesForm = ref({ legalName: '', inn: '', accountNumber: '', bik: '' })
const savingPartnerRequisites = ref(false)
const posterDownloading = ref(false)
const tbankConfigured = ref(false)
const adminConfig = ref(null)

const form = ref({
  name: '',
  slug: '',
  displayCode: '',
  citySlug: 'ulan-ude',
  address: '',
  lat: '',
  lng: '',
  openingHoursWeekdays: '09:00-19:00',
  openingHoursSaturday: '',
  openingHoursSunday: '',
  acceptsOnlineOrders: true,
  pickupInstructions: 'После оплаты назовите оператору номер заказа.',
  estimatedReadyMinutes: '1-3',
  entryPhotoUrl: '',
  pricePerPageKopeks: 1000,
  commissionPercent: 25,
  transferPhone: '',
  transferBankLabel: '',
  paymentMethodsEnabled: ['SBP_TRANSFER', 'ON_SITE'],
  isActive: true,
  visibleInList: false,
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
  if (urls.go) URL.revokeObjectURL(urls.go)
}

function closeClientLinks() {
  revokeClientLinkQrUrls()
  clientLinks.value = null
}

function closeBindingsPanel() {
  bindingsPanel.value = null
}

function openBindings(point) {
  tokenResult.value = null
  closeClientLinks()
  bindingsPanel.value = {
    point,
    staffChannels: point.staffChannels ?? [],
    partner: point.partner ?? null,
  }
  populatePartnerRequisitesForm(point.partner)
}

function populatePartnerRequisitesForm(partner) {
  const r = partner?.requisites ?? {}
  partnerRequisitesForm.value = {
    legalName: r.legalName ?? '',
    inn: r.inn ?? '',
    accountNumber: r.accountNumber ?? '',
    bik: r.bik ?? '',
  }
}

async function savePartnerRequisites() {
  if (!bindingsPanel.value?.partner || savingPartnerRequisites.value) return
  savingPartnerRequisites.value = true
  error.value = ''
  success.value = ''
  try {
    const data = await $fetch(`/api/admin/partners/${bindingsPanel.value.partner.id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: { requisites: { ...partnerRequisitesForm.value } },
    })
    const updatedPartner = {
      ...bindingsPanel.value.partner,
      requisites: data.partner.requisites,
      requisitesComplete: data.partner.requisitesComplete,
    }
    bindingsPanel.value.partner = updatedPartner
    const listPoint = points.value.find((item) => item.id === bindingsPanel.value.point.id)
    if (listPoint) {
      listPoint.partner = updatedPartner
    }
    success.value = 'Реквизиты партнёра сохранены'
    setTimeout(() => { success.value = '' }, 2000)
  } catch (e) {
    error.value = e?.data?.error ?? 'Не удалось сохранить реквизиты'
  } finally {
    savingPartnerRequisites.value = false
  }
}

function bindingsSummary(point) {
  const staffCount = point.staffChannels?.length ?? 0
  const hasPartner = Boolean(point.partner)
  const parts = []
  if (staffCount > 0) {
    parts.push(`${staffCount} сотр.`)
  }
  if (hasPartner) {
    parts.push('партнёр')
  }
  return parts.length > 0 ? parts.join(', ') : '—'
}

async function unbindStaffChannel(channel) {
  if (!bindingsPanel.value || unbindingStaffId.value) return
  const point = bindingsPanel.value.point
  const label = channel.label || channel.platform
  if (!confirm(`Отвязать ${label} от точки «${point.name}»?`)) return

  unbindingStaffId.value = channel.id
  error.value = ''
  success.value = ''
  try {
    await $fetch(`/api/admin/points/${point.id}/staff/${channel.id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    bindingsPanel.value.staffChannels = bindingsPanel.value.staffChannels.filter(
      (item) => item.id !== channel.id,
    )
    const listPoint = points.value.find((item) => item.id === point.id)
    if (listPoint) {
      listPoint.staffChannels = bindingsPanel.value.staffChannels
    }
    success.value = 'Сотрудник отвязан'
    setTimeout(() => { success.value = '' }, 2000)
  } catch (e) {
    error.value = e?.data?.error ?? 'Не удалось отвязать сотрудника'
  } finally {
    unbindingStaffId.value = null
  }
}

async function unbindPartner() {
  if (!bindingsPanel.value?.partner || unbindingPartner.value) return
  const point = bindingsPanel.value.point
  const partnerName = bindingsPanel.value.partner.displayName
  if (!confirm(`Отвязать партнёра «${partnerName}» от точки «${point.name}»?`)) return

  unbindingPartner.value = true
  error.value = ''
  success.value = ''
  try {
    await $fetch(`/api/admin/points/${point.id}/partner`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    bindingsPanel.value.partner = null
    const listPoint = points.value.find((item) => item.id === point.id)
    if (listPoint) {
      listPoint.partner = null
    }
    success.value = 'Партнёр отвязан'
    setTimeout(() => { success.value = '' }, 2000)
  } catch (e) {
    error.value = e?.data?.error ?? 'Не удалось отвязать партнёра'
  } finally {
    unbindingPartner.value = false
  }
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
    citySlug: 'ulan-ude',
    address: '',
    lat: '',
    lng: '',
    openingHoursWeekdays: '09:00-19:00',
    openingHoursSaturday: '',
    openingHoursSunday: '',
    acceptsOnlineOrders: true,
    pickupInstructions: 'После оплаты назовите оператору номер заказа.',
    estimatedReadyMinutes: '1-3',
    entryPhotoUrl: '',
    pricePerPageKopeks: 1000,
    commissionPercent: 25,
    transferPhone: '',
    transferBankLabel: '',
    paymentMethodsEnabled: ['SBP_TRANSFER', 'ON_SITE'],
    isActive: true,
    visibleInList: false,
  }
}

function openCreate() {
  resetForm()
  showForm.value = true
  tokenResult.value = null
  closeClientLinks()
  closeBindingsPanel()
}

function openEdit(point) {
  editingPoint.value = point
  form.value = {
    name: point.name,
    slug: point.slug,
    displayCode: point.displayCode ?? '',
    citySlug: point.citySlug ?? 'ulan-ude',
    address: point.address ?? '',
    lat: point.lat != null ? String(point.lat) : '',
    lng: point.lng != null ? String(point.lng) : '',
    openingHoursWeekdays: point.openingHoursWeekdays ?? '',
    openingHoursSaturday: point.openingHoursSaturday ?? '',
    openingHoursSunday: point.openingHoursSunday ?? '',
    acceptsOnlineOrders: point.acceptsOnlineOrders ?? true,
    pickupInstructions: point.pickupInstructions ?? '',
    estimatedReadyMinutes: point.estimatedReadyMinutes ?? '',
    entryPhotoUrl: point.entryPhotoUrl ?? '',
    pricePerPageKopeks: point.pricePerPageKopeks,
    commissionPercent: point.commissionPercent ?? 25,
    transferPhone: point.transferPhone ?? '',
    transferBankLabel: point.transferBankLabel ?? '',
    paymentMethodsEnabled: [...point.paymentMethodsEnabled],
    isActive: point.isActive,
    visibleInList: point.visibleInList ?? true,
  }
  showForm.value = true
  tokenResult.value = null
  closeClientLinks()
  closeBindingsPanel()
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
    if (bindingsPanel.value) {
      const fresh = data.points.find((item) => item.id === bindingsPanel.value.point.id)
      if (fresh) {
        bindingsPanel.value = {
          point: fresh,
          staffChannels: fresh.staffChannels ?? [],
          partner: fresh.partner ?? null,
        }
        populatePartnerRequisitesForm(fresh.partner)
      }
    }
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

async function toggleVisibleInList(point) {
  if (!adminSecret.value || saving.value) return
  const next = !(point.visibleInList ?? true)
  saving.value = true
  error.value = ''
  success.value = ''
  try {
    const data = await $fetch(`/api/admin/points/${point.id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: { visibleInList: next },
    })
    const updated = data.point
    const listPoint = points.value.find((item) => item.id === point.id)
    if (listPoint) {
      listPoint.visibleInList = updated.visibleInList
    }
    if (bindingsPanel.value?.point.id === point.id) {
      bindingsPanel.value.point = { ...bindingsPanel.value.point, visibleInList: updated.visibleInList }
    }
    success.value = next ? 'Точка показывается в списке' : 'Точка скрыта из списка'
    setTimeout(() => { success.value = '' }, 2000)
  } catch (e) {
    error.value = e?.data?.error ?? 'Не удалось обновить видимость точки'
  } finally {
    saving.value = false
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
      citySlug: form.value.citySlug.trim() || 'ulan-ude',
      address: form.value.address.trim() || null,
      lat: form.value.lat.trim() || null,
      lng: form.value.lng.trim() || null,
      openingHoursWeekdays: form.value.openingHoursWeekdays.trim() || null,
      openingHoursSaturday: form.value.openingHoursSaturday.trim() || null,
      openingHoursSunday: form.value.openingHoursSunday.trim() || null,
      acceptsOnlineOrders: form.value.acceptsOnlineOrders,
      pickupInstructions: form.value.pickupInstructions.trim() || null,
      estimatedReadyMinutes: form.value.estimatedReadyMinutes.trim() || null,
      entryPhotoUrl: form.value.entryPhotoUrl.trim() || null,
      pricePerPageKopeks: Number(form.value.pricePerPageKopeks),
      commissionPercent: Number(form.value.commissionPercent),
      transferPhone: form.value.transferPhone.trim() || null,
      transferBankLabel: form.value.transferBankLabel.trim() || null,
      paymentMethodsEnabled: form.value.paymentMethodsEnabled,
      isActive: form.value.isActive,
      visibleInList: form.value.visibleInList,
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
  closeBindingsPanel()
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
  closeBindingsPanel()
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
  closeBindingsPanel()
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
  closeBindingsPanel()
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
    if (data.links.goLink) {
      const blob = await $fetch(`/api/admin/points/${point.id}/qr`, {
        headers: authHeaders(),
        query: { platform: 'go' },
        responseType: 'blob',
      })
      qrUrls.go = URL.createObjectURL(blob)
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
        v-if="bindingsPanel"
        class="mb-4 rounded-lg border border-gray-200 bg-white p-4 text-sm"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="font-semibold text-gray-900">
              Привязки бота — {{ bindingsPanel.point.name }}
            </p>
            <p class="mt-1 text-xs text-gray-500">
              Сотрудники получают уведомления о заказах; партнёр — доступ к кабинету точки
            </p>
          </div>
          <button
            class="text-xs text-gray-500 underline hover:text-gray-700"
            @click="closeBindingsPanel"
          >
            Закрыть
          </button>
        </div>

        <div class="mt-4">
          <p class="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            Сотрудники
          </p>
          <div
            v-if="bindingsPanel.staffChannels.length"
            class="space-y-2"
          >
            <div
              v-for="channel in bindingsPanel.staffChannels"
              :key="channel.id"
              class="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-gray-50 px-3 py-2"
            >
              <div>
                <p class="font-medium text-gray-900">
                  {{ channel.label }}
                </p>
                <p class="font-mono text-xs text-gray-600">
                  ID: {{ channel.identifier }}
                </p>
                <p class="text-xs text-gray-500">
                  Привязан {{ formatDateTime(channel.boundAt) }}
                </p>
              </div>
              <button
                class="rounded border border-red-200 bg-white px-3 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                :disabled="unbindingStaffId === channel.id"
                @click="unbindStaffChannel(channel)"
              >
                {{ unbindingStaffId === channel.id ? 'Отвязка…' : 'Отвязать' }}
              </button>
            </div>
          </div>
          <p
            v-else
            class="rounded-md border border-dashed px-3 py-2 text-xs text-gray-500"
          >
            Нет привязанных сотрудников. Нажмите «Сотрудники» в таблице, чтобы выдать ссылку.
          </p>
        </div>

        <div class="mt-4">
          <p class="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            Партнёр
          </p>
          <div
            v-if="bindingsPanel.partner"
            class="space-y-3"
          >
            <div class="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-amber-50 px-3 py-2">
              <div>
                <p class="font-medium text-gray-900">
                  {{ bindingsPanel.partner.displayName }}
                </p>
                <p
                  v-if="bindingsPanel.partner.telegramId"
                  class="font-mono text-xs text-gray-600"
                >
                  Telegram ID: {{ bindingsPanel.partner.telegramId }}
                </p>
                <p
                  v-else-if="bindingsPanel.partner.maxUserId"
                  class="font-mono text-xs text-gray-600"
                >
                  MAX ID: {{ bindingsPanel.partner.maxUserId }}
                </p>
                <p class="mt-1">
                  <span
                    class="inline-flex rounded-full px-2 py-0.5 text-xs"
                    :class="bindingsPanel.partner.requisitesComplete
                      ? 'border border-green-200 bg-green-50 text-green-800'
                      : 'border border-amber-200 bg-amber-50 text-amber-800'"
                  >
                    {{ bindingsPanel.partner.requisitesComplete ? 'Реквизиты заполнены' : 'Реквизиты не заполнены' }}
                  </span>
                </p>
              </div>
              <button
                class="rounded border border-red-200 bg-white px-3 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                :disabled="unbindingPartner"
                @click="unbindPartner"
              >
                {{ unbindingPartner ? 'Отвязка…' : 'Отвязать' }}
              </button>
            </div>

            <div class="rounded-md border bg-white p-3">
              <p class="mb-3 text-xs font-medium text-gray-700">
                Реквизиты для выплат
              </p>
              <div class="grid gap-3 sm:grid-cols-2">
                <div class="sm:col-span-2">
                  <label class="mb-1 block text-xs text-gray-600">Название (ИП / ООО)</label>
                  <input
                    v-model="partnerRequisitesForm.legalName"
                    type="text"
                    class="w-full rounded border px-3 py-2 text-sm"
                    placeholder="ИП Иванов Иван Иванович"
                  >
                </div>
                <div>
                  <label class="mb-1 block text-xs text-gray-600">ИНН</label>
                  <input
                    v-model="partnerRequisitesForm.inn"
                    type="text"
                    inputmode="numeric"
                    class="w-full rounded border px-3 py-2 text-sm"
                  >
                </div>
                <div>
                  <label class="mb-1 block text-xs text-gray-600">БИК</label>
                  <input
                    v-model="partnerRequisitesForm.bik"
                    type="text"
                    inputmode="numeric"
                    class="w-full rounded border px-3 py-2 text-sm"
                  >
                </div>
                <div class="sm:col-span-2">
                  <label class="mb-1 block text-xs text-gray-600">Расчётный счёт</label>
                  <input
                    v-model="partnerRequisitesForm.accountNumber"
                    type="text"
                    inputmode="numeric"
                    class="w-full rounded border px-3 py-2 text-sm"
                  >
                </div>
              </div>
              <div class="mt-3 flex flex-wrap gap-2">
                <button
                  class="rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
                  :disabled="savingPartnerRequisites"
                  @click="savePartnerRequisites"
                >
                  {{ savingPartnerRequisites ? 'Сохранение…' : 'Сохранить реквизиты' }}
                </button>
                <NuxtLink
                  to="/admin/payouts"
                  class="rounded border px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                >
                  Выплаты →
                </NuxtLink>
              </div>
            </div>
          </div>
          <p
            v-else
            class="rounded-md border border-dashed px-3 py-2 text-xs text-gray-500"
          >
            Партнёр не привязан. Нажмите «Партнёр» в таблице, чтобы выдать ссылку.
          </p>
        </div>
      </div>

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
            <label class="mb-1 block text-sm text-gray-700">Город (slug)</label>
            <input
              v-model="form.citySlug"
              class="w-full rounded border px-3 py-2 text-sm font-mono"
              placeholder="ulan-ude"
            >
          </div>
          <div class="sm:col-span-2">
            <AdminAddressSuggestInput
              v-model:address="form.address"
              v-model:lat="form.lat"
              v-model:lng="form.lng"
              :city-slug="form.citySlug"
              :auth-headers="authHeaders"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-700">График будни</label>
            <input
              v-model="form.openingHoursWeekdays"
              class="w-full rounded border px-3 py-2 text-sm font-mono"
              placeholder="09:00-19:00"
            >
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-700">График суббота</label>
            <input
              v-model="form.openingHoursSaturday"
              class="w-full rounded border px-3 py-2 text-sm font-mono"
              placeholder="10:00-16:00"
            >
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-700">График воскресенье</label>
            <input
              v-model="form.openingHoursSunday"
              class="w-full rounded border px-3 py-2 text-sm font-mono"
              placeholder=""
            >
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-700">Готовность (мин)</label>
            <input
              v-model="form.estimatedReadyMinutes"
              class="w-full rounded border px-3 py-2 text-sm"
              placeholder="1-3"
            >
          </div>
          <div class="sm:col-span-2">
            <label class="mb-1 block text-sm text-gray-700">Как получить заказ</label>
            <textarea
              v-model="form.pickupInstructions"
              rows="2"
              class="w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div class="sm:col-span-2">
            <label class="mb-1 block text-sm text-gray-700">URL фото входа</label>
            <input
              v-model="form.entryPhotoUrl"
              class="w-full rounded border px-3 py-2 text-sm"
              placeholder="https://..."
            >
          </div>
          <div class="sm:col-span-2">
            <label class="flex items-center gap-2 text-sm text-gray-700">
              <input
                v-model="form.acceptsOnlineOrders"
                type="checkbox"
                class="rounded"
              >
              Принимает онлайн-заказы
            </label>
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
          <div class="sm:col-span-2">
            <label class="flex items-center gap-2 text-sm">
              <input
                v-model="form.visibleInList"
                type="checkbox"
              >
              Показывать в списке выбора в боте
            </label>
            <p class="mt-1 text-xs text-gray-500">
              Если выключено — точка доступна только по QR-коду, ссылке или коду (например, /start 102)
            </p>
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
                Бот
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
                <div class="flex flex-col gap-1">
                  <span
                    class="inline-flex w-fit rounded-full px-2 py-0.5 text-xs"
                    :class="point.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'"
                  >
                    {{ point.isActive ? 'активна' : 'выкл' }}
                  </span>
                  <label
                    class="flex items-center gap-1.5 text-xs text-gray-600"
                    :title="point.visibleInList !== false
                      ? 'Точка видна в списке выбора'
                      : 'Только QR, ссылка или код'"
                  >
                    <input
                      type="checkbox"
                      class="rounded"
                      :checked="point.visibleInList !== false"
                      :disabled="saving || !point.isActive"
                      @change="toggleVisibleInList(point)"
                    >
                    {{ point.visibleInList !== false ? 'в списке' : 'скрыта' }}
                  </label>
                </div>
              </td>
              <td class="px-4 py-3 text-xs text-gray-600">
                {{ bindingsSummary(point) }}
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
                    title="Просмотр и отвязка сотрудников и партнёра"
                    @click="openBindings(point)"
                  >
                    Привязки
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
                colspan="8"
                class="px-4 py-8 text-center text-gray-500"
              >
                Нет точек. Создайте первую.
              </td>
            </tr>
            <tr v-if="loading">
              <td
                colspan="8"
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
