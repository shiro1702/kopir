<script setup lang="ts">
import type { TelegramLoginUser } from '~/composables/useTelegramLoginWidget'

definePageMeta({ layout: false })

useHead({
  meta: [{ name: 'robots', content: 'noindex' }],
  title: 'Вход в кабинет партнёра — Kopir',
})

const config = useRuntimeConfig()
const route = useRoute()
const botUsername = computed(() =>
  String(config.public.telegramBotUsername ?? '').replace(/^@/, '').trim(),
)

const widgetEl = ref<HTMLElement | null>(null)
const submitting = ref(false)
const error = ref('')

async function onAuth(user: TelegramLoginUser) {
  if (submitting.value) return
  submitting.value = true
  error.value = ''
  try {
    await $fetch('/api/partner/auth/telegram', {
      method: 'POST',
      body: { mode: 'login', telegram: user },
    })
    const next = typeof route.query.next === 'string' ? route.query.next : '/partner'
    await navigateTo(next.startsWith('/partner') ? next : '/partner')
  } catch (err: unknown) {
    const data = (err as { data?: { data?: { code?: string, error?: string } } })?.data?.data
    if (data?.code === 'PARTNER_NOT_FOUND') {
      error.value = 'Аккаунт не найден. Сначала зарегистрируйтесь.'
    } else {
      error.value = data?.error || 'Не удалось войти'
    }
  } finally {
    submitting.value = false
  }
}

useTelegramLoginWidget(widgetEl, {
  botUsername: botUsername.value,
  onAuth,
})
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
    <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <p class="text-sm font-medium text-slate-500">
        Kopir
      </p>
      <h1 class="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
        Вход в кабинет
      </h1>
      <p class="mt-2 text-sm leading-6 text-slate-600">
        Войдите через Telegram — тот же аккаунт, что привязан в боте.
      </p>

      <div
        v-if="!botUsername"
        class="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900"
      >
        Telegram Login не настроен (нужен TELEGRAM_BOT_USERNAME).
      </div>

      <div
        ref="widgetEl"
        class="mt-6 flex min-h-12 justify-center"
      />

      <p
        v-if="submitting"
        class="mt-3 text-center text-sm text-slate-500"
      >
        Входим…
      </p>
      <p
        v-if="error"
        class="mt-3 text-center text-sm text-red-600"
      >
        {{ error }}
        <NuxtLink
          v-if="error.includes('зарегистрируйтесь')"
          to="/partner/register"
          class="ml-1 font-semibold underline"
        >
          Регистрация
        </NuxtLink>
      </p>

      <p class="mt-8 text-center text-sm text-slate-500">
        Нет аккаунта?
        <NuxtLink
          to="/partner/register"
          class="font-semibold text-slate-900 underline"
        >
          Зарегистрироваться
        </NuxtLink>
      </p>
    </div>
  </div>
</template>
