<script setup lang="ts">
import type { FaqItem } from '~/utils/marketing/home-landing'

defineProps<{
  items: FaqItem[]
}>()
</script>

<template>
  <div class="space-y-3">
    <details
      v-for="(item, index) in items"
      :key="index"
      class="group rounded-xl border border-gray-200 bg-white"
    >
      <summary
        class="cursor-pointer list-none px-5 py-4 text-base font-medium text-gray-900 marker:content-none [&::-webkit-details-marker]:hidden"
      >
        <span class="flex items-start justify-between gap-3">
          <span>{{ item.question }}</span>
          <span
            class="mt-0.5 shrink-0 text-gray-400 transition group-open:rotate-45"
            aria-hidden="true"
          >+</span>
        </span>
      </summary>
      <p class="border-t border-gray-100 px-5 pb-4 pt-3 leading-7 text-gray-700">
        {{ item.answer }}
      </p>
    </details>
  </div>
</template>
