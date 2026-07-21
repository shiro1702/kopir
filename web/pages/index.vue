<script setup lang="ts">
import {
  HOME_ABOUT,
  HOME_BOT_FEATURES,
  HOME_DOCUMENT_TYPES,
  HOME_FAQ,
  HOME_FINAL_CTA,
  HOME_HERO,
  HOME_HOW,
  HOME_INFO_STAND,
  HOME_OTHER_SERVICES,
  HOME_PARTNERS_TEASER,
  HOME_POINTS,
  HOME_PRICING,
  HOME_SEO,
  formatHomePricingText,
  formatPriceRub,
} from '~/utils/marketing/home-landing'

definePageMeta({ layout: 'marketing' })

type PublicPoint = {
  slug: string
  name: string
  displayCode: string | null
  pricePerPageKopeks: number
  agentOnline: boolean
}

const legal = useLegalEntity()
const { data: pointsData } = await useFetch<{ points: PublicPoint[] }>('/api/points')

const points = computed(() => pointsData.value?.points ?? [])

const minPriceKopeks = computed(() => {
  const prices = points.value.map((point) => point.pricePerPageKopeks)
  if (prices.length === 0) {
    return HOME_PRICING.pilotFallbackPriceRub * 100
  }
  return Math.min(...prices)
})

const pricingText = computed(() =>
  formatHomePricingText(formatPriceRub(minPriceKopeks.value)),
)

const faqJsonLd = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: HOME_FAQ.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
}))

const organizationJsonLd = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: legal.name,
  url: legal.siteUrl,
  email: legal.email,
}))

useSeoMeta({
  title: HOME_SEO.title,
  description: HOME_SEO.description,
  ogTitle: HOME_SEO.title,
  ogDescription: HOME_SEO.description,
})

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: () => JSON.stringify(faqJsonLd.value),
    },
    {
      type: 'application/ld+json',
      innerHTML: () => JSON.stringify(organizationJsonLd.value),
    },
  ],
})
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="border-b border-gray-200/80 bg-white py-14 sm:py-20">
      <div class="mx-auto max-w-4xl px-4 sm:px-6">
        <div class="flex flex-wrap gap-2">
          <span
            v-for="badge in HOME_HERO.badges"
            :key="badge"
            class="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
          >
            {{ badge }}
          </span>
        </div>
        <h1 class="mt-6 text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          {{ HOME_SEO.h1 }}
        </h1>
        <p class="mt-5 max-w-2xl text-lg leading-8 text-gray-600">
          {{ HOME_HERO.subtitle }}
        </p>
        <div class="mt-8">
          <SiteMarketingCtaButtons />
        </div>
        <p class="mt-5 text-sm text-gray-500">
          {{ HOME_HERO.footnote }}
        </p>
      </div>
    </section>

    <!-- About -->
    <SiteMarketingSection
      id="about"
      :title="HOME_ABOUT.title"
    >
      <div class="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        <p
          v-for="(paragraph, index) in HOME_ABOUT.paragraphs"
          :key="index"
          class="leading-7 text-gray-700"
        >
          {{ paragraph }}
        </p>
      </div>
    </SiteMarketingSection>

    <!-- How it works -->
    <SiteMarketingSection
      id="how"
      :title="HOME_HOW.title"
    >
      <ol class="grid gap-4 sm:grid-cols-2">
        <li
          v-for="(step, index) in HOME_HOW.steps"
          :key="step.title"
          class="rounded-2xl border border-gray-200 bg-white p-6"
        >
          <p class="text-sm font-semibold text-blue-600">
            Шаг {{ index + 1 }}
          </p>
          <h3 class="mt-2 text-lg font-semibold text-gray-900">
            {{ step.title }}
          </h3>
          <p class="mt-2 leading-7 text-gray-700">
            {{ step.description }}
          </p>
        </li>
      </ol>
      <div class="mt-8">
        <SiteMarketingCtaButtons variant="print" />
      </div>
    </SiteMarketingSection>

    <!-- Bot features -->
    <SiteMarketingSection :title="HOME_BOT_FEATURES.title">
      <div class="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        <p class="leading-7 text-gray-700">
          {{ HOME_BOT_FEATURES.intro }}
        </p>
        <ul class="mt-4 space-y-2">
          <li
            v-for="item in HOME_BOT_FEATURES.items"
            :key="item"
            class="flex gap-2 leading-7 text-gray-700"
          >
            <span class="text-blue-600">—</span>
            <span>{{ item }}</span>
          </li>
        </ul>
        <p class="mt-5 text-sm leading-6 text-gray-500">
          {{ HOME_BOT_FEATURES.roadmap }}
        </p>
      </div>
    </SiteMarketingSection>

    <!-- Document types -->
    <SiteMarketingSection :title="HOME_DOCUMENT_TYPES.title">
      <div class="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        <p class="leading-7 text-gray-700">
          {{ HOME_DOCUMENT_TYPES.intro }}
        </p>
        <ul class="mt-4 grid gap-2 sm:grid-cols-2">
          <li
            v-for="item in HOME_DOCUMENT_TYPES.items"
            :key="item"
            class="flex gap-2 leading-7 text-gray-700"
          >
            <span class="text-blue-600">—</span>
            <span>{{ item }}</span>
          </li>
        </ul>
      </div>
    </SiteMarketingSection>

    <!-- Pricing -->
    <SiteMarketingSection :title="HOME_PRICING.title">
      <div class="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        <p class="text-lg font-medium text-gray-900">
          {{ pricingText }}
        </p>
        <p class="mt-3 leading-7 text-gray-700">
          {{ HOME_PRICING.note }}
        </p>
      </div>
    </SiteMarketingSection>

    <!-- Points -->
    <SiteMarketingSection
      id="points"
      :title="HOME_POINTS.title"
    >
      <div
        v-if="points.length === 0"
        class="rounded-2xl border border-dashed border-gray-300 bg-white p-6 sm:p-8"
      >
        <p class="leading-7 text-gray-700">
          {{ HOME_POINTS.pilotEmpty }}
        </p>
      </div>
      <div
        v-else
        class="grid gap-4 sm:grid-cols-2"
      >
        <article
          v-for="point in points"
          :key="point.slug"
          class="rounded-2xl border border-gray-200 bg-white p-6"
        >
          <div class="flex items-start justify-between gap-3">
            <h3 class="text-lg font-semibold text-gray-900">
              {{ point.name }}
            </h3>
            <span
              class="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
              :class="point.agentOnline
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-600'"
            >
              {{ point.agentOnline ? HOME_POINTS.onlineLabel : HOME_POINTS.offlineLabel }}
            </span>
          </div>
          <p
            v-if="point.displayCode"
            class="mt-2 text-sm text-gray-500"
          >
            Код точки: {{ point.displayCode }}
          </p>
          <p class="mt-3 text-sm text-gray-700">
            А4 ч/б — {{ formatPriceRub(point.pricePerPageKopeks) }} ₽/стр.
          </p>
        </article>
      </div>
    </SiteMarketingSection>

    <!-- Other services -->
    <SiteMarketingSection :title="HOME_OTHER_SERVICES.title">
      <div class="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        <p class="leading-7 text-gray-700">
          {{ HOME_OTHER_SERVICES.intro }}
        </p>
        <ul class="mt-4 grid gap-2 sm:grid-cols-2">
          <li
            v-for="item in HOME_OTHER_SERVICES.items"
            :key="item"
            class="flex gap-2 leading-7 text-gray-700"
          >
            <span class="text-blue-600">—</span>
            <span>{{ item }}</span>
          </li>
        </ul>
        <p class="mt-5 leading-7 text-gray-600">
          {{ HOME_OTHER_SERVICES.note }}
        </p>
      </div>
    </SiteMarketingSection>

    <!-- Partners teaser -->
    <SiteMarketingSection
      id="partners"
      :title="HOME_PARTNERS_TEASER.title"
    >
      <div class="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        <p class="leading-7 text-gray-700">
          {{ HOME_PARTNERS_TEASER.intro }}
        </p>
        <p class="mt-4 font-medium text-gray-900">
          Для копицентра это:
        </p>
        <ul class="mt-3 space-y-2">
          <li
            v-for="benefit in HOME_PARTNERS_TEASER.benefits"
            :key="benefit"
            class="flex gap-2 leading-7 text-gray-700"
          >
            <span class="text-blue-600">—</span>
            <span>{{ benefit }}</span>
          </li>
        </ul>
        <div class="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          <SiteMarketingCtaButtons variant="partner" />
          <NuxtLink
            to="/partners"
            class="text-sm font-semibold text-blue-600 hover:underline"
          >
            {{ HOME_PARTNERS_TEASER.moreLink }} →
          </NuxtLink>
        </div>
      </div>
    </SiteMarketingSection>

    <!-- Info stand -->
    <SiteMarketingSection :title="HOME_INFO_STAND.title">
      <div class="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        <p class="leading-7 text-gray-700">
          {{ HOME_INFO_STAND.intro }}
        </p>
        <ul class="mt-4 grid gap-2 sm:grid-cols-2">
          <li
            v-for="item in HOME_INFO_STAND.items"
            :key="item"
            class="flex gap-2 leading-7 text-gray-700"
          >
            <span class="text-blue-600">—</span>
            <span>{{ item }}</span>
          </li>
        </ul>
        <p class="mt-5 leading-7 text-gray-600">
          {{ HOME_INFO_STAND.note }}
        </p>
      </div>
    </SiteMarketingSection>

    <!-- FAQ -->
    <SiteMarketingSection
      id="faq"
      title="Частые вопросы"
    >
      <SiteMarketingFaq :items="HOME_FAQ" />
    </SiteMarketingSection>

    <!-- Final CTA -->
    <section class="bg-white py-14 sm:py-16">
      <div class="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <h2 class="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          {{ HOME_FINAL_CTA.title }}
        </h2>
        <p class="mx-auto mt-4 max-w-2xl leading-8 text-gray-600">
          {{ HOME_FINAL_CTA.text }}
        </p>
        <div class="mt-8 flex justify-center">
          <SiteMarketingCtaButtons />
        </div>
      </div>
    </section>
  </div>
</template>
