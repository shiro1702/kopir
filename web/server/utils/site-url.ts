export function getPublicSiteUrl(): string | null {
  const explicit = String(process.env.NUXT_PUBLIC_SITE_URL ?? '').trim()
  if (explicit) {
    return explicit.startsWith('http') ? explicit : `https://${explicit}`
  }

  const vercelUrl = String(process.env.VERCEL_URL ?? '').trim()
  if (vercelUrl) {
    return `https://${vercelUrl}`
  }

  return null
}
