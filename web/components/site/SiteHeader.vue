<script setup lang="ts">
const route = useRoute()
const clientLinks = useClientBotLinks()
const partnerLinks = usePartnerBotLinks()
const menuOpen = ref(false)

const navLinks = [
  { href: '/#how', label: 'Как работает' },
  { href: '/#points', label: 'Точки печати' },
  { to: '/partners', label: 'Для копицентров' },
  { href: '/#faq', label: 'FAQ' },
]

function isActive(link: { to?: string, href?: string }): boolean {
  if (link.to) {
    return route.path === link.to
  }
  return false
}

function closeMenu() {
  menuOpen.value = false
}
</script>

<template>
  <header class="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
    <div class="mx-auto max-w-4xl px-4 sm:px-6">
      <div class="flex items-center justify-between gap-3 py-3">
        <NuxtLink
          to="/"
          class="text-lg font-semibold text-gray-900"
          @click="closeMenu"
        >
          Kopir
        </NuxtLink>

        <button
          type="button"
          class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-gray-200 text-gray-700 sm:hidden"
          :aria-expanded="menuOpen"
          aria-label="Меню"
          @click="menuOpen = !menuOpen"
        >
          <span class="text-xl leading-none">{{ menuOpen ? '×' : '☰' }}</span>
        </button>

        <nav class="hidden items-center gap-4 text-sm sm:flex">
          <template
            v-for="link in navLinks"
          >
            <NuxtLink
              v-if="link.to"
              :key="link.label"
              :to="link.to"
              class="text-gray-600 hover:text-gray-900"
              :class="{ 'font-semibold text-gray-900': isActive(link) }"
            >
              {{ link.label }}
            </NuxtLink>
            <a
              v-else
              :key="link.label"
              :href="link.href"
              class="text-gray-600 hover:text-gray-900"
            >
              {{ link.label }}
            </a>
          </template>
        </nav>

        <div class="hidden items-center gap-2 sm:flex">
          <a
            v-if="clientLinks.hasTelegram && clientLinks.telegramPrintUrl"
            :href="clientLinks.telegramPrintUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex min-h-11 items-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Распечатать
          </a>
          <a
            v-if="partnerLinks.hasTelegram && partnerLinks.telegramPartnerUrl"
            :href="partnerLinks.telegramPartnerUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex min-h-11 items-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
          >
            Подключить точку
          </a>
        </div>
      </div>

      <div
        v-if="menuOpen"
        class="border-t border-gray-100 pb-4 pt-3 sm:hidden"
      >
        <nav class="flex flex-col gap-1">
          <template
            v-for="link in navLinks"
          >
            <NuxtLink
              v-if="link.to"
              :key="`mobile-${link.label}`"
              :to="link.to"
              class="min-h-11 rounded-lg px-2 py-2 text-gray-700 hover:bg-gray-50"
              @click="closeMenu"
            >
              {{ link.label }}
            </NuxtLink>
            <a
              v-else
              :key="`mobile-${link.label}`"
              :href="link.href"
              class="min-h-11 rounded-lg px-2 py-2 text-gray-700 hover:bg-gray-50"
              @click="closeMenu"
            >
              {{ link.label }}
            </a>
          </template>
        </nav>
        <div class="mt-3 flex flex-col gap-2">
          <a
            v-if="clientLinks.hasTelegram && clientLinks.telegramPrintUrl"
            :href="clientLinks.telegramPrintUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            @click="closeMenu"
          >
            Распечатать в Telegram
          </a>
          <a
            v-if="partnerLinks.hasTelegram && partnerLinks.telegramPartnerUrl"
            :href="partnerLinks.telegramPartnerUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
            @click="closeMenu"
          >
            Подключить точку
          </a>
        </div>
      </div>
    </div>
  </header>
</template>
