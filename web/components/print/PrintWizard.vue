<script setup lang="ts">
import QRCode from 'qrcode'
import type { PrintWizardStep } from '~/types/print'
import { DEFAULT_CITY_SLUG } from '~/types/point-picker'

const props = withDefaults(defineProps<{
  mode?: 'site' | 'miniapp'
  initialPointSlug?: string | null
  initialBatchId?: string | null
}>(), {
  mode: 'site',
  initialPointSlug: null,
  initialBatchId: null,
})

const emit = defineEmits<{
  step: [step: PrintWizardStep]
}>()

const clientLinks = useClientBotLinks()
const legal = useLegalEntity()
const print = usePrintBatch({ initialPointSlug: props.initialPointSlug })
const supportMailto = computed(
  () => `mailto:${legal.email}?subject=${encodeURIComponent('Проблема с печатью')}`,
)

const step = ref<PrintWizardStep>('files')
const showPointPicker = ref(false)
const checkingPayment = ref(false)
const qrDataUrl = ref<string | null>(null)
const dragOver = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const pollTimer = ref<ReturnType<typeof setInterval> | null>(null)

const citySlug = computed(() => print.batch?.point?.citySlug || DEFAULT_CITY_SLUG)

watch(step, (value) => emit('step', value))

watch(
  () => print.payment?.payUrl,
  async (payUrl) => {
    qrDataUrl.value = null
    if (!payUrl || print.payment?.channel === 'card') {
      return
    }
    try {
      qrDataUrl.value = await QRCode.toDataURL(payUrl, {
        width: 240,
        margin: 2,
        errorCorrectionLevel: 'M',
      })
    } catch {
      qrDataUrl.value = null
    }
  },
  { immediate: true },
)

function formatAmount(kopeks: number): string {
  return `${(kopeks / 100).toFixed(kopeks % 100 === 0 ? 0 : 2)} ₽`
}

function stopPolling() {
  if (pollTimer.value) {
    clearInterval(pollTimer.value)
    pollTimer.value = null
  }
}

function startStatusPolling() {
  stopPolling()
  const batchId = print.batch?.id
  if (!batchId) {
    return
  }
  pollTimer.value = setInterval(async () => {
    try {
      const status = await print.fetchStatus(batchId, print.payment?.paymentId)
      if (status.batch.status === 'PAID'
        || status.batch.status === 'COMPLETED'
        || status.batch.status === 'PARTIALLY_FAILED'
        || status.progress.allPrinted) {
        step.value = 'status'
      }
      if (status.batch.status !== 'AWAITING_PAYMENT' && status.batch.status !== 'COLLECTING') {
        step.value = 'status'
      }
      if (['COMPLETED', 'PARTIALLY_FAILED', 'CANCELLED'].includes(status.batch.status)
        || status.progress.allPrinted) {
        stopPolling()
      }
    } catch {
      // keep polling; transient network errors
    }
  }, 3000)
}

async function bootstrap() {
  try {
    if (props.mode === 'miniapp' && import.meta.client) {
      const initData = getTelegramWebApp()?.initData
      if (initData) {
        const data = await print.authMiniApp(initData)
        const startPoint = data.startParam && data.startParam !== 'print'
          ? data.startParam
          : props.initialPointSlug
        if (startPoint) {
          await print.setPoint(startPoint)
        }
      } else {
        await print.ensureSession()
        if (props.initialPointSlug) {
          await print.setPoint(props.initialPointSlug)
        }
      }
    } else {
      await print.ensureSession()
      if (props.initialPointSlug) {
        await print.setPoint(props.initialPointSlug)
      }
    }

    if (props.initialBatchId) {
      await print.fetchStatus(props.initialBatchId)
      if (print.batch && print.batch.status !== 'COLLECTING') {
        step.value = print.batch.status === 'AWAITING_PAYMENT' ? 'payment' : 'status'
        if (step.value === 'payment' || step.value === 'status') {
          startStatusPolling()
        }
      }
    } else if (print.batch && print.batch.status === 'AWAITING_PAYMENT') {
      step.value = 'payment'
      startStatusPolling()
    } else if (print.batch && !['COLLECTING', 'CANCELLED'].includes(print.batch.status)) {
      step.value = 'status'
      startStatusPolling()
    }
  } catch {
    // error shown via print.error
  }
}

async function onFilesSelected(files: FileList | File[] | null) {
  if (!files || (Array.isArray(files) ? files.length === 0 : files.length === 0)) {
    return
  }
  await print.uploadFiles(files)
}

function onFileInputChange(event: Event) {
  const input = event.target as HTMLInputElement
  void onFilesSelected(input.files)
  input.value = ''
}

function onCopiesChange(orderId: string, event: Event) {
  const select = event.target as HTMLSelectElement
  void print.updateCopies(orderId, Number(select.value))
}

function onDrop(event: DragEvent) {
  dragOver.value = false
  const files = event.dataTransfer?.files
  if (files?.length) {
    void onFilesSelected(files)
  }
}

async function goToPointOrPay() {
  if (!print.batch?.orders.length) {
    return
  }
  if (!print.batch.point) {
    step.value = 'point'
    showPointPicker.value = true
    return
  }
  await doCheckout()
}

async function onPointSelected(slug: string) {
  await print.setPoint(slug)
  showPointPicker.value = false
  step.value = 'files'
}

async function doCheckout() {
  await print.checkout('sbp')
  step.value = 'payment'
  startStatusPolling()
}

async function checkPaymentNow() {
  if (!print.batch?.id) {
    return
  }
  checkingPayment.value = true
  try {
    const status = await print.fetchStatus(print.batch.id, print.payment?.paymentId)
    if (status.batch.status !== 'AWAITING_PAYMENT') {
      step.value = 'status'
    }
  } finally {
    checkingPayment.value = false
  }
}

const messengerFallbackUrl = computed(() => {
  const slug = print.pointSlug
  if (slug) {
    return clientLinks.telegramPointUrl(slug) || clientLinks.maxPointUrl(slug)
  }
  return clientLinks.telegramPrintUrl || clientLinks.maxPrintUrl
})

onMounted(() => {
  void bootstrap()
})

onBeforeUnmount(() => {
  stopPolling()
})

type PrintTelegramWebApp = {
  initData?: string
  ready?: () => void
  expand?: () => void
  MainButton?: {
    setText: (text: string) => void
    show: () => void
    hide: () => void
    onClick: (cb: () => void) => void
    offClick: (cb: () => void) => void
  }
}

function getTelegramWebApp(): PrintTelegramWebApp | null {
  if (!import.meta.client) {
    return null
  }
  return (window as unknown as { Telegram?: { WebApp?: PrintTelegramWebApp } }).Telegram?.WebApp ?? null
}

const mainButtonHandler = ref<(() => void) | null>(null)

watch(
  [step, () => print.canCheckout, () => print.loading],
  () => {
    if (props.mode !== 'miniapp' || !import.meta.client) {
      return
    }
    const app = getTelegramWebApp()
    if (!app?.MainButton) {
      return
    }
    if (mainButtonHandler.value) {
      app.MainButton.offClick(mainButtonHandler.value)
      mainButtonHandler.value = null
    }
    if (step.value === 'files' && print.canCheckout) {
      const handler = () => { void goToPointOrPay() }
      mainButtonHandler.value = handler
      app.MainButton.setText('Оплатить')
      app.MainButton.show()
      app.MainButton.onClick(handler)
    } else if (step.value === 'payment') {
      const handler = () => { void checkPaymentNow() }
      mainButtonHandler.value = handler
      app.MainButton.setText('Проверить оплату')
      app.MainButton.show()
      app.MainButton.onClick(handler)
    } else {
      app.MainButton.hide()
    }
  },
  { immediate: true },
)

onMounted(() => {
  if (props.mode === 'miniapp' && import.meta.client) {
    const app = getTelegramWebApp()
    app?.ready?.()
    app?.expand?.()
  }
})
</script>

<template>
  <div class="mx-auto w-full max-w-xl space-y-6">
    <div
      v-if="print.error"
      class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
    >
      {{ print.error }}
    </div>

    <div
      v-if="!print.ready && print.loading"
      class="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600"
    >
      Загружаем…
    </div>

    <template v-else>
      <!-- Files step -->
      <section
        v-if="step === 'files' || step === 'point'"
        class="space-y-4"
      >
        <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h1 class="text-xl font-bold text-gray-900">
            Печать документов
          </h1>
          <p class="mt-1 text-sm text-gray-600">
            Загрузите PDF или Word, выберите точку и оплатите онлайн.
          </p>

          <div
            v-if="print.batch?.point || print.pointSlug"
            class="mt-4 flex items-start justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3"
          >
            <div>
              <p class="text-xs font-medium uppercase tracking-wide text-gray-500">
                Точка печати
              </p>
              <p class="mt-0.5 text-sm font-semibold text-gray-900">
                {{ print.batch?.point?.name || print.pointSlug }}
              </p>
              <p
                v-if="print.batch?.point?.address"
                class="mt-0.5 text-xs text-gray-600"
              >
                {{ print.batch.point.address }}
              </p>
            </div>
            <button
              type="button"
              class="shrink-0 text-sm font-semibold text-blue-600 hover:underline"
              @click="step = 'point'; showPointPicker = true"
            >
              Изменить
            </button>
          </div>
          <button
            v-else
            type="button"
            class="mt-4 w-full rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            @click="step = 'point'; showPointPicker = true"
          >
            Выбрать точку печати
          </button>
        </div>

        <div
          class="rounded-2xl border-2 border-dashed bg-white p-6 text-center transition"
          :class="dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'"
          @dragover.prevent="dragOver = true"
          @dragleave.prevent="dragOver = false"
          @drop.prevent="onDrop"
        >
          <p class="text-sm font-medium text-gray-900">
            Перетащите файлы сюда
          </p>
          <p class="mt-1 text-xs text-gray-500">
            PDF, DOC, DOCX · до 20 МБ
          </p>
          <button
            type="button"
            class="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            :disabled="print.uploading"
            @click="fileInput?.click()"
          >
            {{ print.uploading ? 'Загрузка…' : 'Выбрать файлы' }}
          </button>
          <input
            ref="fileInput"
            type="file"
            class="hidden"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            multiple
            @change="onFileInputChange"
          >
        </div>

        <div
          v-if="print.batch?.orders?.length"
          class="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-semibold text-gray-900">
              Файлы ({{ print.batch.orders.length }})
            </h2>
            <p class="text-sm font-medium text-gray-700">
              {{ formatAmount(print.batch.totalAmountKopeks) }}
            </p>
          </div>

          <div
            v-for="order in print.batch.orders"
            :key="order.id"
            class="flex flex-col gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-gray-900">
                {{ order.fileName }}
              </p>
              <p class="text-xs text-gray-500">
                <template v-if="order.status === 'CALCULATING'">
                  Считаем страницы…
                </template>
                <template v-else-if="order.status === 'CALCULATION_FAILED'">
                  Ошибка расчёта
                </template>
                <template v-else>
                  {{ order.pageCount }} стр. · {{ formatAmount(order.amountKopeks) }}
                </template>
              </p>
            </div>
            <div class="flex items-center gap-2">
              <label class="flex items-center gap-1 text-xs text-gray-600">
                Копии
                <select
                  class="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm"
                  :value="order.copies"
                  :disabled="order.status === 'CALCULATING'"
                  @change="onCopiesChange(order.id, $event)"
                >
                  <option
                    v-for="n in 10"
                    :key="n"
                    :value="n"
                  >
                    {{ n }}
                  </option>
                </select>
              </label>
              <button
                type="button"
                class="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                :disabled="order.status === 'CALCULATING'"
                @click="print.removeOrder(order.id)"
              >
                Удалить
              </button>
            </div>
          </div>

          <button
            type="button"
            class="flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!print.canCheckout || print.loading"
            @click="goToPointOrPay"
          >
            <template v-if="print.hasCalculating">
              Ждём расчёт страниц…
            </template>
            <template v-else-if="!print.batch.point">
              Выбрать точку и оплатить
            </template>
            <template v-else>
              Оплатить {{ formatAmount(print.batch.totalAmountKopeks) }}
            </template>
          </button>
        </div>

        <div
          v-if="showPointPicker || step === 'point'"
          class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-sm font-semibold text-gray-900">
              Выберите точку
            </h2>
            <button
              v-if="print.batch?.orders?.length"
              type="button"
              class="text-sm text-gray-500 hover:text-gray-800"
              @click="showPointPicker = false; step = 'files'"
            >
              Закрыть
            </button>
          </div>
          <PointPickerLayout
            :city-slug="citySlug"
            mode="miniapp"
            title="Точки печати"
            subtitle="Нажмите на точку, чтобы печатать здесь."
            @select="onPointSelected"
          />
        </div>

        <div
          v-if="mode === 'site' && messengerFallbackUrl"
          class="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600"
        >
          Удобнее в мессенджере?
          <a
            :href="messengerFallbackUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="font-semibold text-blue-600 hover:underline"
          >
            Открыть бота
          </a>
        </div>
      </section>

      <!-- Payment step -->
      <section
        v-else-if="step === 'payment'"
        class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <h1 class="text-xl font-bold text-gray-900">
          Оплата
        </h1>
        <p class="mt-1 text-sm text-gray-600">
          Заказ №{{ print.payment?.shortId || print.batch?.shortId }} · {{ print.amountLabel }}
        </p>

        <div
          v-if="qrDataUrl"
          class="mt-6 flex flex-col items-center"
        >
          <img
            :src="qrDataUrl"
            alt="QR для оплаты СБП"
            class="h-60 w-60 rounded-xl border border-gray-100"
          >
          <p class="mt-3 text-center text-sm text-gray-600">
            Отсканируйте QR в приложении банка (СБП)
          </p>
        </div>

        <a
          v-if="print.payment?.payUrl"
          :href="print.payment.payUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Открыть оплату
        </a>

        <button
          type="button"
          class="mt-3 flex min-h-11 w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50"
          :disabled="checkingPayment"
          @click="checkPaymentNow"
        >
          {{ checkingPayment ? 'Проверяем…' : 'Проверить оплату' }}
        </button>
      </section>

      <!-- Status step -->
      <section
        v-else
        class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <h1 class="text-xl font-bold text-gray-900">
          Статус заказа
        </h1>
        <p class="mt-1 text-sm text-gray-600">
          №{{ print.batch?.shortId }}
        </p>

        <div class="mt-5 space-y-2">
          <p class="text-sm text-gray-800">
            <span class="font-medium">Статус:</span>
            <template v-if="print.batch?.status === 'PAID'">
              Оплачен, отправляем на печать
            </template>
            <template v-else-if="print.batch?.status === 'COMPLETED'">
              Готово — заберите распечатку
            </template>
            <template v-else-if="print.batch?.status === 'PARTIALLY_FAILED'">
              Часть файлов не напечаталась — обратитесь к оператору
            </template>
            <template v-else-if="print.batch?.status === 'AWAITING_PAYMENT'">
              Ожидаем оплату
            </template>
            <template v-else>
              {{ print.batch?.status }}
            </template>
          </p>
          <p
            v-if="print.batch?.point"
            class="text-sm text-gray-600"
          >
            Точка: {{ print.batch.point.name }}
            <span v-if="print.batch.point.address"> · {{ print.batch.point.address }}</span>
          </p>
        </div>

        <ul
          v-if="print.batch?.orders?.length"
          class="mt-4 space-y-2"
        >
          <li
            v-for="order in print.batch.orders"
            :key="order.id"
            class="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700"
          >
            {{ order.fileName }}
            <span class="text-gray-500">· {{ order.status }}</span>
          </li>
        </ul>

        <a
          :href="supportMailto"
          class="mt-6 inline-flex text-sm font-semibold text-blue-600 hover:underline"
        >
          Проблема с печатью
        </a>
      </section>
    </template>
  </div>
</template>
