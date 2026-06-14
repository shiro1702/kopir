export type PaymentMode = 'terminal' | 'online'

export function getPaymentMode(): PaymentMode {
  const config = useRuntimeConfig()
  const raw = String(config.paymentMode ?? 'terminal').toLowerCase()
  return raw === 'online' ? 'online' : 'terminal'
}

export function isTerminalPaymentMode(): boolean {
  return getPaymentMode() === 'terminal'
}

export function getStaffTelegramChatId(): number | null {
  const config = useRuntimeConfig()
  const raw = String(config.staffTelegramChatId ?? '').trim()
  if (!raw) {
    return null
  }
  const chatId = Number(raw)
  return Number.isFinite(chatId) ? chatId : null
}

export function getStaffMaxUserId(): number | null {
  const config = useRuntimeConfig()
  const raw = String(config.staffMaxUserId ?? '').trim()
  if (!raw) {
    return null
  }
  const userId = Number(raw)
  return Number.isFinite(userId) ? userId : null
}

export function isStaffChannelConfigured(): boolean {
  return getStaffTelegramChatId() !== null || getStaffMaxUserId() !== null
}
