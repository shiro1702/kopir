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
    // Vercel serverless runtime does not reliably load traced node_modules for SSR.
    // Explicit package names required — regex like /^@vue\// does NOT inline subpaths.
    externals: {
      inline: [
        '@vue/server-renderer',
        '@vue/compiler-dom',
        '@vue/runtime-dom',
        '@vue/shared',
        '@vue/runtime-core',
        '@vue/compiler-core',
        '@vue/compiler-ssr',
        '@vue/reactivity',
        'vue',
        'vue-bundle-renderer',
        'vue-router',
        'unhead',
        'devalue',
        'hookable',
        'entities',
        'estree-walker',
        'source-map-js',
      ],
    },
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
    paymentMode: process.env.PAYMENT_MODE ?? 'terminal',
    staffTelegramChatId: process.env.STAFF_TELEGRAM_CHAT_ID ?? '',
    staffMaxUserId: process.env.STAFF_MAX_USER_ID ?? '',
    public: {
      appVersion: '0.0.1',
    },
  },
})
