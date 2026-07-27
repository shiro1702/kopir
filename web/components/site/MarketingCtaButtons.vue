<script setup lang="ts">
import { HOME_HERO } from '~/utils/marketing/home-landing'

withDefaults(defineProps<{
  variant?: 'both' | 'print' | 'partner'
  printLabel?: string
  partnerLabel?: string
  stack?: boolean
}>(), {
  variant: 'both',
  printLabel: HOME_HERO.printCta,
  partnerLabel: HOME_HERO.partnerCta,
  stack: true,
})

const clientLinks = useClientBotLinks()
const partnerLinks = usePartnerBotLinks()
</script>

<template>
  <div
    class="flex gap-3"
    :class="stack ? 'flex-col sm:flex-row' : 'flex-row flex-wrap'"
  >
    <template v-if="variant === 'both' || variant === 'print'">
      <NuxtLink
        to="/print"
        class="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-700"
      >
        {{ printLabel }}
      </NuxtLink>
    </template>

    <NuxtLink
      v-if="variant === 'both' || variant === 'partner'"
      to="/partner/register"
      class="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-3 text-center text-sm font-semibold text-gray-900 transition hover:bg-gray-50"
    >
      {{ partnerLabel }}
    </NuxtLink>

    <a
      v-if="clientLinks.hasTelegram && clientLinks.telegramPrintUrl && (variant === 'both' || variant === 'print')"
      :href="clientLinks.telegramPrintUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-3 text-center text-sm font-semibold text-gray-900 transition hover:bg-gray-50"
    >
      В Telegram
    </a>

    <a
      v-if="clientLinks.maxPrintUrl && (variant === 'both' || variant === 'print')"
      :href="clientLinks.maxPrintUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-3 text-center text-sm font-semibold text-gray-900 transition hover:bg-gray-50"
    >
      В MAX
    </a>

    <a
      v-if="partnerLinks.maxPartnerUrl && (variant === 'both' || variant === 'partner')"
      :href="partnerLinks.maxPartnerUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-3 text-center text-sm font-semibold text-gray-900 transition hover:bg-gray-50"
    >
      Стать партнёром в MAX
    </a>
  </div>
</template>
