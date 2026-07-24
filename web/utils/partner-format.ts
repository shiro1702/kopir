export function formatPartnerRubles(kopeks: number): string {
  const rubles = kopeks / 100
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 2,
  }).format(rubles)
}

export function formatPricePerPage(kopeks: number): string {
  return `${formatPartnerRubles(kopeks)}/стр.`
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  TBANK_SBP: 'СБП (Т-Банк)',
  TBANK_ONLINE: 'Карта / онлайн (Т-Банк)',
  SBP_TRANSFER: 'Перевод СБП',
  ON_SITE: 'На месте',
}
