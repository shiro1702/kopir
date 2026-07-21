<script setup lang="ts">
defineProps<{
  id?: string
  title?: string
  subtitle?: string
  narrow?: boolean
}>()
</script>

<template>
  <section
    :id="id"
    class="scroll-mt-20 border-b border-gray-200/80 py-12 sm:py-16"
  >
    <div
      class="mx-auto px-4 sm:px-6"
      :class="narrow ? 'max-w-3xl' : 'max-w-4xl'"
    >
      <header
        v-if="title || subtitle"
        class="mb-8"
      >
        <h2
          v-if="title"
          class="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl"
        >
          {{ title }}
        </h2>
        <p
          v-if="subtitle"
          class="mt-3 text-lg leading-8 text-gray-600"
        >
          {{ subtitle }}
        </p>
      </header>
      <slot />
    </div>
  </section>
</template>
