<template>
  <div class="flex min-h-screen flex-col bg-gray-50 text-gray-900">
    <SiteHeader />
    <main class="flex-1">
      <slot />
    </main>
    <SiteFooter />
  </div>
</template>
