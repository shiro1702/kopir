import type { PrintBatch, PrintPaymentInfo } from '~/types/print'

type SessionResponse = {
  userId: string
  preferredPointSlug: string | null
  batch: PrintBatch | null
}

type BatchResponse = {
  batch: PrintBatch | null
}

type UploadResponse = {
  batch: PrintBatch | null
  orderId: string
}

type CheckoutResponse = {
  batch: PrintBatch | null
  payment: PrintPaymentInfo
}

type StatusResponse = {
  batch: PrintBatch
  paymentId: string | null
  payment: { paymentId: string, payUrl: string | null, amountKopeks: number } | null
  paymentCheck: { ok: boolean, pending?: boolean, alreadyConfirmed?: boolean, entityId?: string } | null
  progress: { allPrinted: boolean, anyPrinting: boolean }
}

function apiErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: { data?: { error?: string }, error?: string } }).data
    return data?.data?.error || data?.error || fallback
  }
  return fallback
}

export function usePrintBatch(options?: {
  initialPointSlug?: string | null
}) {
  const batch = ref<PrintBatch | null>(null)
  const payment = ref<PrintPaymentInfo | null>(null)
  const preferredPointSlug = ref<string | null>(null)
  const pointSlug = ref<string | null>(options?.initialPointSlug ?? null)
  const loading = ref(false)
  const uploading = ref(false)
  const error = ref<string | null>(null)
  const ready = ref(false)

  async function ensureSession() {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<SessionResponse>('/api/print/session', { method: 'POST' })
      preferredPointSlug.value = data.preferredPointSlug
      batch.value = data.batch
      if (!pointSlug.value && data.preferredPointSlug) {
        pointSlug.value = data.preferredPointSlug
      }
      if (!pointSlug.value && data.batch?.point?.slug) {
        pointSlug.value = data.batch.point.slug
      }
      ready.value = true
      return data
    } catch (err) {
      error.value = apiErrorMessage(err, 'Не удалось создать сессию')
      throw err
    } finally {
      loading.value = false
    }
  }

  async function authMiniApp(initData: string) {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<SessionResponse & { startParam: string | null }>('/api/auth/miniapp', {
        method: 'POST',
        body: { initData, platform: 'telegram' },
      })
      preferredPointSlug.value = data.preferredPointSlug
      batch.value = data.batch
      if (data.startParam && data.startParam !== 'print') {
        pointSlug.value = data.startParam
      }
      ready.value = true
      return data
    } catch (err) {
      error.value = apiErrorMessage(err, 'Не удалось авторизоваться в Mini App')
      throw err
    } finally {
      loading.value = false
    }
  }

  async function refreshBatch() {
    const data = await $fetch<BatchResponse>('/api/print/batch')
    batch.value = data.batch
    if (data.batch?.point?.slug) {
      pointSlug.value = data.batch.point.slug
    }
    return data.batch
  }

  async function setPoint(slug: string) {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<BatchResponse>('/api/print/batch/point', {
        method: 'PATCH',
        body: { pointSlug: slug },
      })
      batch.value = data.batch
      pointSlug.value = slug
      return data.batch
    } catch (err) {
      error.value = apiErrorMessage(err, 'Не удалось выбрать точку')
      throw err
    } finally {
      loading.value = false
    }
  }

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files)
    if (list.length === 0) {
      return
    }
    uploading.value = true
    error.value = null
    try {
      for (const file of list) {
        const form = new FormData()
        form.append('file', file)
        if (pointSlug.value) {
          form.append('pointSlug', pointSlug.value)
        }
        const data = await $fetch<UploadResponse>('/api/print/batch/upload', {
          method: 'POST',
          body: form,
        })
        batch.value = data.batch
      }
    } catch (err) {
      error.value = apiErrorMessage(err, 'Не удалось загрузить файл')
      throw err
    } finally {
      uploading.value = false
    }
  }

  async function updateCopies(orderId: string, copies: number) {
    error.value = null
    try {
      const data = await $fetch<{ batch: PrintBatch | null }>(`/api/print/batch/orders/${orderId}`, {
        method: 'PATCH',
        body: { copies },
      })
      batch.value = data.batch
    } catch (err) {
      error.value = apiErrorMessage(err, 'Не удалось изменить копии')
      throw err
    }
  }

  async function removeOrder(orderId: string) {
    error.value = null
    try {
      const data = await $fetch<{ batch: PrintBatch | null }>(`/api/print/batch/orders/${orderId}`, {
        method: 'DELETE',
      })
      batch.value = data.batch
    } catch (err) {
      error.value = apiErrorMessage(err, 'Не удалось удалить файл')
      throw err
    }
  }

  async function checkout(channel: 'sbp' | 'card' = 'sbp') {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<CheckoutResponse>('/api/print/batch/checkout', {
        method: 'POST',
        body: { channel },
      })
      batch.value = data.batch
      payment.value = data.payment
      return data
    } catch (err) {
      error.value = apiErrorMessage(err, 'Не удалось перейти к оплате')
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchStatus(batchId: string, paymentId?: string | null) {
    const query = paymentId ? `?paymentId=${encodeURIComponent(paymentId)}` : ''
    const data = await $fetch<StatusResponse>(`/api/print/batch/${batchId}/status${query}`)
    batch.value = data.batch
    if (data.payment?.payUrl && data.payment.paymentId) {
      payment.value = {
        paymentId: data.payment.paymentId,
        payUrl: data.payment.payUrl,
        channel: 'sbp',
        amountKopeks: data.payment.amountKopeks,
        shortId: data.batch.shortId,
      }
    }
    return data
  }

  const hasCalculating = computed(() =>
    (batch.value?.orders ?? []).some((o) => o.status === 'CALCULATING'),
  )

  const canCheckout = computed(() => {
    const b = batch.value
    if (!b || b.status !== 'COLLECTING') {
      return false
    }
    if (!b.point || b.orders.length === 0) {
      return false
    }
    if (hasCalculating.value) {
      return false
    }
    return b.orders.every((o) => o.status === 'AWAITING_PAYMENT')
  })

  const amountLabel = computed(() => {
    const kopeks = payment.value?.amountKopeks ?? batch.value?.totalAmountKopeks ?? 0
    return `${(kopeks / 100).toFixed(kopeks % 100 === 0 ? 0 : 2)} ₽`
  })

  return reactive({
    batch,
    payment,
    preferredPointSlug,
    pointSlug,
    loading,
    uploading,
    error,
    ready,
    hasCalculating,
    canCheckout,
    amountLabel,
    ensureSession,
    authMiniApp,
    refreshBatch,
    setPoint,
    uploadFiles,
    updateCopies,
    removeOrder,
    checkout,
    fetchStatus,
  })
}
