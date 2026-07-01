const STORAGE_KEY = 'kopir_admin_secret'

export function useAdminAuth() {
  const adminSecret = useState('kopir-admin-secret', () => '')

  if (import.meta.client && !adminSecret.value) {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      adminSecret.value = stored
    }
  }

  function persistSecret(secret?: string) {
    const trimmed = (secret ?? adminSecret.value).trim()
    if (!trimmed) {
      return false
    }
    adminSecret.value = trimmed
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, trimmed)
    }
    return true
  }

  function saveSecret(): string | null {
    if (!adminSecret.value.trim()) {
      return 'Введите ADMIN_SECRET'
    }
    persistSecret()
    return null
  }

  function authHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${adminSecret.value}` }
  }

  function clearSecret() {
    adminSecret.value = ''
    if (import.meta.client) {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  function rememberOnSuccess() {
    if (adminSecret.value.trim()) {
      persistSecret()
    }
  }

  return {
    adminSecret,
    saveSecret,
    persistSecret,
    authHeaders,
    clearSecret,
    rememberOnSuccess,
  }
}
