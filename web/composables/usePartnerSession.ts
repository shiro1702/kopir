export type PartnerMeResponse = {
  partner: {
    id: string
    name: string | null
    offerAcceptedAt: string | null
    createdAt: string
    requisites: {
      legalName: string
      inn: string
      accountNumber: string
      bik: string
    } | null
    requisitesComplete: boolean
  }
  balanceKopeks: number
  recentEntries: Array<{
    id: string
    type: 'CREDIT' | 'PAYOUT'
    amountKopeks: number
    createdAt: string
    pointName: string | null
    batchId: string | null
  }>
  today: {
    pages: number
    amountKopeks: number
  }
  points: Array<{
    id: string
    slug: string
    name: string
    displayCode: string | null
    address: string | null
    isActive: boolean
    pricePerPageKopeks: number
    paymentMethodsEnabled: string[]
    transferPhone: string | null
    transferBankLabel: string | null
    commissionPercent: number
    lastSeenAt: string | null
    agentOnline: boolean
  }>
}

export function usePartnerSession() {
  const me = useState<PartnerMeResponse | null>('partner-me', () => null)
  const loading = useState('partner-me-loading', () => false)
  const error = useState('partner-me-error', () => '')

  async function fetchMe(): Promise<PartnerMeResponse | null> {
    loading.value = true
    error.value = ''
    try {
      const data = await $fetch<PartnerMeResponse>('/api/partner/me')
      me.value = data
      return data
    } catch (err: unknown) {
      me.value = null
      const status = (err as { statusCode?: number, status?: number })?.statusCode
        ?? (err as { status?: number })?.status
      if (status === 401) {
        error.value = ''
        return null
      }
      error.value = 'Не удалось загрузить кабинет'
      return null
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try {
      await $fetch('/api/partner/auth/logout', { method: 'POST' })
    } finally {
      me.value = null
    }
  }

  return {
    me,
    loading,
    error,
    fetchMe,
    logout,
  }
}
