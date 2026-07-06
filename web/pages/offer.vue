<script setup lang="ts">
import { buildAgentOfferSections, getOfferMeta } from '~/utils/legal/agent-offer'

definePageMeta({ layout: 'marketing' })

const legal = useLegalEntity()
const sections = computed(() => buildAgentOfferSections(legal))
const meta = getOfferMeta()

useSeoMeta({
  title: 'Публичная оферта — агентский договор | Kopir',
  description: 'Условия агентского договора для партнёров Kopir: комиссия, выплаты, права и обязанности сторон.',
  ogTitle: 'Публичная оферта Kopir',
  ogDescription: 'Агентский договор-оферта для владельцев точек печати.',
})
</script>

<template>
  <article class="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
    <header class="mb-10">
      <h1 class="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        Публичная оферта
      </h1>
      <p class="mt-3 text-lg text-gray-600">
        Агентский договор на приём платежей и информационно-техническое обслуживание точек печати
      </p>
      <p class="mt-4 text-sm text-gray-500">
        Редакция от {{ meta.date }} · версия {{ meta.version }}
      </p>
    </header>

    <div class="space-y-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-10">
      <section
        v-for="section in sections"
        :key="section.title"
        class="space-y-3"
      >
        <h2 class="text-xl font-semibold text-gray-900">
          {{ section.title }}
        </h2>
        <p
          v-for="(paragraph, index) in section.paragraphs"
          :key="`${section.title}-${index}`"
          class="leading-7 text-gray-700"
        >
          {{ paragraph }}
        </p>
      </section>
    </div>

    <p class="mt-8 text-sm leading-6 text-gray-500">
      Привязка личного кабинета партнёра в боте Kopir означает согласие с условиями настоящей Оферты.
      По вопросам подключения напишите на
      <a
        :href="`mailto:${legal.email}`"
        class="text-blue-600 hover:underline"
      >{{ legal.email }}</a>.
    </p>
  </article>
</template>
