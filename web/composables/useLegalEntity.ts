import type { LegalEntity } from '~/utils/legal/agent-offer'

export function useLegalEntity(): LegalEntity {
  const config = useRuntimeConfig()

  return {
    name: String(config.public.legalEntityName ?? '').trim() || 'Оператор платформы Kopir',
    inn: String(config.public.legalInn ?? '').trim(),
    ogrnip: String(config.public.legalOgrnip ?? '').trim(),
    address: String(config.public.legalAddress ?? '').trim(),
    email: String(config.public.legalEmail ?? '').trim() || 'support@kopir.ru',
    siteUrl: String(config.public.siteUrl ?? '').trim().replace(/\/$/, '') || 'https://kopir.ru',
  }
}

export function useOfferUrl(): string {
  const { siteUrl } = useLegalEntity()
  return `${siteUrl}/offer`
}
