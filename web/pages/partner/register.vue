<script setup lang="ts">
import type { TelegramLoginUser } from '~/composables/useTelegramLoginWidget'
import { PARTNER_ECONOMICS } from '~/utils/marketing/partner-landing'

definePageMeta({ layout: false })

useHead({
  meta: [{ name: 'robots', content: 'noindex' }],
  title: 'Регистрация партнёра — Kopir',
})

const config = useRuntimeConfig()
const botUsername = computed(() =>
  String(config.public.telegramBotUsername ?? '').replace(/^@/, '').trim(),
)

const widgetEl = ref<HTMLElement | null>(null)
const acceptOffer = ref(false)
const pendingUser = ref<TelegramLoginUser | null>(null)
const submitting = ref(false)
const error = ref('')

async function submitRegistration(user: TelegramLoginUser) {
  if (submitting.value) return
  if (!acceptOffer.value) {
    error.value = 'Примите публичную оферту, чтобы продолжить'
    pendingUser.value = user
    return
  }

  submitting.value = true
  error.value = ''
  try {
    await $fetch('/api/partner/auth/telegram', {
      method: 'POST',
      body: {
        mode: 'register',
        acceptOffer: true,
        telegram: user,
      },
    })
    await navigateTo('/partner')
  } catch (err: unknown) {
    const data = (err as { data?: { data?: { error?: string } } })?.data?.data
    error.value = data?.error || 'Не удалось зарегистрироваться'
  } finally {
    submitting.value = false
  }
}

async function onAuth(user: TelegramLoginUser) {
  pendingUser.value = user
  await submitRegistration(user)
}

async function confirmAfterOffer() {
  if (!pendingUser.value) {
    error.value = 'Сначала войдите через Telegram'
    return
  }
  await submitRegistration(pendingUser.value)
}

useTelegramLoginWidget(widgetEl, {
  botUsername: botUsername.value,
  onAuth,
})
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10">
    <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <p class="text-sm font-medium text-slate-500">
        Kopir
      </p>
      <h1 class="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
        Регистрация партнёра
      </h1>
      <p class="mt-2 text-sm leading-6 text-slate-600">
        Создайте кабинет через Telegram. Доля партнёра на старте —
        {{ PARTNER_ECONOMICS.partnerShare }}% от онлайн-заказов
        (комиссия платформы {{ PARTNER_ECONOMICS.platformShare }}%).
      </p>

      <label class="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4">
        <input
          v-model="acceptOffer"
          type="checkbox"
          class="mt-1 h-4 w-4 rounded border-slate-300"
        >
        <span class="text-sm leading-5 text-slate-700">
          Принимаю
          <NuxtLink
            to="/offer"
            target="_blank"
            class="font-semibold text-blue-700 underline"
          >
            публичную оферту
          </NuxtLink>
          (агентский договор)
        </span>
      </label>

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

      <button
        v-if="pendingUser && acceptOffer"
        type="button"
        class="mt-4 flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-900 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        :disabled="submitting"
        @click="confirmAfterOffer"
      >
        {{ submitting ? 'Создаём кабинет…' : 'Продолжить регистрацию' }}
      </button>

      <p
        v-if="error"
        class="mt-3 text-center text-sm text-red-600"
      >
        {{ error }}
      </p>

      <p class="mt-6 text-xs leading-5 text-slate-500">
        После регистрации точку к кабинету привязывает менеджер Kopir
        (или через `/partner bind_…` в боте). В BotFather нужен
        <code class="rounded bg-slate-100 px-1">/setdomain</code>
        для домена сайта.
      </p>

      <p class="mt-6 text-center text-sm text-slate-500">
        Уже есть аккаунт?
        <NuxtLink
          to="/partner/login"
          class="font-semibold text-slate-900 underline"
        >
          Войти
        </NuxtLink>
      </p>
    </div>
  </div>
</template>
