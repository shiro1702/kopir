// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  typescript: {
    strict: true,
  },
  nitro: {
    preset: 'vercel',
  },
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL,
    blobReadWriteToken: process.env.BLOB_READ_WRITE_TOKEN,
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    maxBotToken: process.env.MAX_BOT_TOKEN,
    maxWebhookSecret: process.env.MAX_WEBHOOK_SECRET,
    adminSecret: process.env.ADMIN_SECRET,
    agentApiKey: process.env.AGENT_API_KEY,
    pricePerPageKopeks: process.env.PRICE_PER_PAGE_KOPEKS ?? '1000',
    calculationTimeoutSec: process.env.CALCULATION_TIMEOUT_SEC ?? '120',
    public: {
      appVersion: '0.0.1',
    },
  },
})
