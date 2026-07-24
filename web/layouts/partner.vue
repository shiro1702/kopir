<script setup lang="ts">
const route = useRoute()
const { logout } = usePartnerSession()

const tabs = [
  { to: '/partner', label: 'Дашборд', exact: true },
  { to: '/partner/points', label: 'Точки' },
  { to: '/partner/finance', label: 'Финансы' },
]

function isActive(tab: { to: string, exact?: boolean }): boolean {
  if (tab.exact) {
    return route.path === tab.to
  }
  return route.path === tab.to || route.path.startsWith(`${tab.to}/`)
}

async function onLogout() {
  await logout()
  await navigateTo('/partner/login')
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-slate-50 text-slate-900">
    <header class="border-b border-slate-200 bg-white">
      <div class="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div class="flex items-center gap-3">
          <NuxtLink
            to="/partner"
            class="text-lg font-semibold tracking-tight"
          >
            Kopir · Кабинет
          </NuxtLink>
        </div>
        <button
          type="button"
          class="min-h-10 rounded-lg px-3 text-sm text-slate-600 hover:bg-slate-100"
          @click="onLogout"
        >
          Выйти
        </button>
      </div>
      <nav class="mx-auto flex max-w-3xl gap-1 px-2 pb-2 sm:px-4">
        <NuxtLink
          v-for="tab in tabs"
          :key="tab.to"
          :to="tab.to"
          class="min-h-10 flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium"
          :class="isActive(tab)
            ? 'bg-slate-900 text-white'
            : 'text-slate-600 hover:bg-slate-100'"
        >
          {{ tab.label }}
        </NuxtLink>
      </nav>
    </header>
    <main class="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
      <slot />
    </main>
  </div>
</template>
