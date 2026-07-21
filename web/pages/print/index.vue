<script setup lang="ts">
import { DEFAULT_CITY_SLUG } from '~/types/point-picker'

definePageMeta({ layout: 'marketing' })

await navigateTo(`/print/${DEFAULT_CITY_SLUG}`, { replace: true })
</script>

<template>
  <div />
</template>
