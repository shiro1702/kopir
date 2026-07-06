<script setup lang="ts">
const links = [
  { to: '/partners', label: 'Партнёрам' },
  { to: '/offer', label: 'Оферта' },
]
</script>

<template>
  <header class="border-b border-gray-200 bg-white">
    <div class="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
      <NuxtLink
        to="/"
        class="text-lg font-semibold text-gray-900"
      >
        Kopir
      </NuxtLink>
      <nav class="flex items-center gap-4 text-sm">
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="text-gray-600 hover:text-gray-900"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>
    </div>
  </header>
</template>
