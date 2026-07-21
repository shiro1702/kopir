<script setup lang="ts">
const year = new Date().getFullYear()
const legal = useLegalEntity()
const clientLinks = useClientBotLinks()

const requisites = computed(() => {
  const parts: string[] = []
  if (legal.inn) {
    parts.push(`ИНН ${legal.inn}`)
  }
  if (legal.ogrnip) {
    parts.push(`ОГРНИП ${legal.ogrnip}`)
  }
  return parts.join(' · ')
})
</script>

<template>
  <footer class="border-t border-gray-200 bg-white">
    <div class="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-8 text-sm text-gray-600 sm:px-6">
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
        <span class="text-gray-400">
          Политика конфиденциальности (скоро)
        </span>
      </div>

      <div class="space-y-1">
        <p
          v-if="requisites"
          class="text-xs text-gray-500"
        >
          {{ requisites }}
        </p>
        <p
          v-if="legal.address"
          class="text-xs text-gray-500"
        >
          {{ legal.address }}
        </p>
        <div class="flex flex-wrap gap-x-4 gap-y-1">
          <a
            v-if="legal.email"
            :href="`mailto:${legal.email}`"
            class="hover:text-gray-900"
          >
            {{ legal.email }}
          </a>
          <a
            v-if="clientLinks.hasTelegram && clientLinks.telegramPrintUrl"
            :href="clientLinks.telegramPrintUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="hover:text-gray-900"
          >
            Telegram-бот
          </a>
        </div>
      </div>

      <p class="text-xs text-gray-500">
        © {{ year }}
        <template v-if="legal.name">
          · {{ legal.name }}
        </template>
        <template v-else>
          · Kopir
        </template>
      </p>
    </div>
  </footer>
</template>
