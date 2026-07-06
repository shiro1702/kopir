<script setup lang="ts">
const year = new Date().getFullYear()
const legal = useLegalEntity()
</script>

<template>
  <footer class="border-t border-gray-200 bg-white">
    <div class="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-8 text-sm text-gray-600 sm:px-6">
      <div class="flex flex-wrap gap-x-4 gap-y-2">
        <NuxtLink
          to="/offer"
          class="hover:text-gray-900"
        >
          Публичная оферта
        </NuxtLink>
        <NuxtLink
          to="/partners"
          class="hover:text-gray-900"
        >
          Партнёрам
        </NuxtLink>
        <a
          v-if="legal.email"
          :href="`mailto:${legal.email}`"
          class="hover:text-gray-900"
        >
          Поддержка
        </a>
      </div>
      <p class="text-xs text-gray-500">
        © {{ year }} Kopir
        <template v-if="legal.name">
          · {{ legal.name }}
        </template>
      </p>
    </div>
  </footer>
</template>
