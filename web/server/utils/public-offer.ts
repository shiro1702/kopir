export function buildPublicOfferUrl(siteUrl: string): string {
  const base = siteUrl.trim().replace(/\/$/, '')
  return base ? `${base}/offer` : '/offer'
}
