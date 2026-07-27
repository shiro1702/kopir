export type TelegramLoginUser = {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

declare global {
  interface Window {
    onKopirTelegramAuth?: (user: TelegramLoginUser) => void
  }
}

type Options = {
  botUsername: string
  onAuth: (user: TelegramLoginUser) => void | Promise<void>
  buttonSize?: 'large' | 'medium' | 'small'
  requestAccess?: boolean
}

/**
 * Mounts Telegram Login Widget into `container`.
 * Requires BotFather /setdomain for the site host.
 */
export function useTelegramLoginWidget(container: Ref<HTMLElement | null>, options: Options) {
  const ready = ref(false)
  const scriptError = ref('')

  function mountWidget() {
    const el = container.value
    if (!el || !options.botUsername) {
      return
    }

    el.innerHTML = ''
    window.onKopirTelegramAuth = (user) => {
      void options.onAuth(user)
    }

    const script = document.createElement('script')
    script.async = true
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', options.botUsername.replace(/^@/, ''))
    script.setAttribute('data-size', options.buttonSize ?? 'large')
    script.setAttribute('data-radius', '10')
    script.setAttribute('data-onauth', 'onKopirTelegramAuth(user)')
    if (options.requestAccess !== false) {
      script.setAttribute('data-request-access', 'write')
    }
    script.onerror = () => {
      scriptError.value = 'Не удалось загрузить Telegram Login'
    }
    script.onload = () => {
      ready.value = true
    }
    el.appendChild(script)
  }

  onMounted(() => {
    mountWidget()
  })

  onBeforeUnmount(() => {
    if (window.onKopirTelegramAuth) {
      delete window.onKopirTelegramAuth
    }
  })

  watch(
    () => options.botUsername,
    () => mountWidget(),
  )

  return { ready, scriptError }
}
