<script setup lang="ts">
import {
  PARTNER_ECONOMICS,
  PARTNER_FAQ,
  PARTNER_FINAL_CTA,
  PARTNER_FOCUS,
  PARTNER_HERO,
  PARTNER_INFO_STAND,
  PARTNER_NOT_AUTO,
  PARTNER_PAIN,
  PARTNER_PILOT,
  PARTNER_SEO,
  PARTNER_SOLUTION,
  PARTNER_STEPS,
} from '~/utils/marketing/partner-landing'

definePageMeta({ layout: 'marketing' })

const legal = useLegalEntity()
const partnerLinks = usePartnerBotLinks()

useSeoMeta({
  title: PARTNER_SEO.title,
  description: PARTNER_SEO.description,
  ogTitle: PARTNER_SEO.title,
  ogDescription: PARTNER_SEO.description,
})
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="border-b border-gray-200/80 bg-white py-14 sm:py-20">
      <div class="mx-auto max-w-4xl px-4 sm:px-6">
        <h1 class="text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          {{ PARTNER_SEO.h1 }}
        </h1>
        <p class="mt-5 max-w-2xl text-lg leading-8 text-gray-600">
          {{ PARTNER_HERO.subtitle }}
        </p>
        <div class="mt-8 flex flex-wrap gap-3">
          <NuxtLink
            to="/partner/register"
            class="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            {{ PARTNER_HERO.cta }}
          </NuxtLink>
          <NuxtLink
            to="/partner/login"
            class="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
          >
            Войти в кабинет
          </NuxtLink>
        </div>
        <p class="mt-4 text-sm text-gray-500">
          Регистрация через Telegram Login · привязка точки — менеджер Kopir или бот
        </p>
        <a
          v-if="partnerLinks.telegramPartnerUrl"
          :href="partnerLinks.telegramPartnerUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-blue-600 hover:underline"
        >
          Или открыть бот партнёра →
        </a>
      </div>
    </section>

    <!-- Pain + Solution -->
    <SiteMarketingSection>
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 class="text-xl font-semibold text-gray-900">
            {{ PARTNER_PAIN.title }}
          </h2>
          <p class="mt-3 leading-7 text-gray-700">
            {{ PARTNER_PAIN.text }}
          </p>
        </div>
        <div class="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 class="text-xl font-semibold text-gray-900">
            {{ PARTNER_SOLUTION.title }}
          </h2>
          <p class="mt-3 leading-7 text-gray-700">
            {{ PARTNER_SOLUTION.text }}
          </p>
        </div>
      </div>
    </SiteMarketingSection>

    <!-- Focus / Not auto -->
    <SiteMarketingSection>
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="rounded-2xl border border-green-200 bg-green-50 p-6">
          <h2 class="text-xl font-semibold text-gray-900">
            {{ PARTNER_FOCUS.title }}
          </h2>
          <ul class="mt-4 space-y-2">
            <li
              v-for="item in PARTNER_FOCUS.items"
              :key="item"
              class="flex gap-2 leading-7 text-gray-700"
            >
              <span class="text-green-600">✓</span>
              <span>{{ item }}</span>
            </li>
          </ul>
        </div>
        <div class="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 class="text-xl font-semibold text-gray-900">
            {{ PARTNER_NOT_AUTO.title }}
          </h2>
          <ul class="mt-4 space-y-2">
            <li
              v-for="item in PARTNER_NOT_AUTO.items"
              :key="item"
              class="flex gap-2 leading-7 text-gray-700"
            >
              <span class="text-gray-400">—</span>
              <span>{{ item }}</span>
            </li>
          </ul>
          <p class="mt-4 text-sm leading-6 text-gray-500">
            {{ PARTNER_NOT_AUTO.note }}
          </p>
        </div>
      </div>
    </SiteMarketingSection>

    <!-- Info stand -->
    <SiteMarketingSection
      :title="PARTNER_INFO_STAND.title"
    >
      <div class="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        <p class="leading-7 text-gray-700">
          {{ PARTNER_INFO_STAND.intro }}
        </p>
        <ul class="mt-4 grid gap-2 sm:grid-cols-2">
          <li
            v-for="item in PARTNER_INFO_STAND.example"
            :key="item"
            class="flex gap-2 leading-7 text-gray-700"
          >
            <span class="text-blue-600">—</span>
            <span>{{ item }}</span>
          </li>
        </ul>
      </div>
    </SiteMarketingSection>

    <!-- Economics -->
    <SiteMarketingSection
      :title="PARTNER_ECONOMICS.title"
    >
      <div class="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        <div class="flex flex-wrap items-baseline gap-3">
          <span class="text-4xl font-bold text-blue-600">
            {{ PARTNER_ECONOMICS.partnerShare }}%
          </span>
          <span class="text-lg text-gray-600">
            партнёру · {{ PARTNER_ECONOMICS.platformShare }}% платформе
          </span>
        </div>
        <p class="mt-4 leading-7 text-gray-700">
          {{ PARTNER_ECONOMICS.text }}
        </p>
        <p class="mt-3 text-sm leading-6 text-gray-500">
          {{ PARTNER_ECONOMICS.example }}
        </p>
      </div>
    </SiteMarketingSection>

    <!-- Pilot + Steps -->
    <SiteMarketingSection
      :title="PARTNER_STEPS.title"
    >
      <div class="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-6">
        <h3 class="font-semibold text-gray-900">
          {{ PARTNER_PILOT.title }}
        </h3>
        <ul class="mt-3 space-y-2">
          <li
            v-for="item in PARTNER_PILOT.items"
            :key="item"
            class="flex gap-2 leading-7 text-gray-700"
          >
            <span class="text-blue-600">—</span>
            <span>{{ item }}</span>
          </li>
        </ul>
      </div>
      <ol class="grid gap-4 sm:grid-cols-2">
        <li
          v-for="(step, index) in PARTNER_STEPS.steps"
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
    </SiteMarketingSection>

    <!-- FAQ -->
    <SiteMarketingSection
      title="Частые вопросы"
    >
      <SiteMarketingFaq :items="PARTNER_FAQ" />
      <p class="mt-6 text-sm leading-6 text-gray-500">
        Условия сотрудничества описаны в
        <NuxtLink
          to="/offer"
          class="text-blue-600 hover:underline"
        >
          публичной оферте
        </NuxtLink>.
      </p>
    </SiteMarketingSection>

    <!-- Final CTA -->
    <section class="border-t border-gray-200 bg-white py-14 sm:py-16">
      <div class="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <h2 class="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          {{ PARTNER_FINAL_CTA.title }}
        </h2>
        <p class="mx-auto mt-4 max-w-2xl leading-8 text-gray-600">
          {{ PARTNER_FINAL_CTA.text }}
        </p>
        <div class="mt-8 flex flex-col items-center gap-3">
          <a
            v-if="partnerLinks.hasTelegram && partnerLinks.telegramPartnerUrl"
            :href="partnerLinks.telegramPartnerUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            {{ PARTNER_HERO.cta }}
          </a>
          <a
            v-else
            :href="`mailto:${legal.email}`"
            class="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white"
          >
            {{ legal.email }}
          </a>
        </div>
      </div>
    </section>
  </div>
</template>
