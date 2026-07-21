<script setup lang="ts">
interface AddressSuggestion {
  address: string
  lat: number | null
  lng: number | null
}

const props = defineProps<{
  address: string
  lat: string
  lng: string
  citySlug?: string
  authHeaders: () => Record<string, string>
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:address': [value: string]
  'update:lat': [value: string]
  'update:lng': [value: string]
}>()

const inputValue = ref(props.address)
const suggestions = ref<AddressSuggestion[]>([])
const loading = ref(false)
const error = ref('')
const open = ref(false)
const selectedAddress = ref(props.address)
const activeIndex = ref(-1)

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let requestId = 0

watch(() => props.address, (value) => {
  inputValue.value = value
  selectedAddress.value = value
})

function clearCoords() {
  emit('update:lat', '')
  emit('update:lng', '')
}

function emitAddress(value: string) {
  emit('update:address', value)
}

function selectSuggestion(item: AddressSuggestion) {
  inputValue.value = item.address
  selectedAddress.value = item.address
  emitAddress(item.address)
  emit('update:lat', item.lat != null ? String(item.lat) : '')
  emit('update:lng', item.lng != null ? String(item.lng) : '')
  suggestions.value = []
  open.value = false
  activeIndex.value = -1
  error.value = ''
}

async function fetchSuggestions(query: string) {
  const trimmed = query.trim()
  if (trimmed.length < 2) {
    suggestions.value = []
    open.value = false
    return
  }

  const currentRequest = ++requestId
  loading.value = true
  error.value = ''

  try {
    const data = await $fetch<{ suggestions: AddressSuggestion[] }>('/api/admin/address-suggest', {
      method: 'POST',
      headers: props.authHeaders(),
      body: {
        query: trimmed,
        citySlug: props.citySlug,
      },
    })

    if (currentRequest !== requestId) {
      return
    }

    suggestions.value = data.suggestions ?? []
    open.value = suggestions.value.length > 0
    activeIndex.value = suggestions.value.length > 0 ? 0 : -1
  } catch (e: unknown) {
    if (currentRequest !== requestId) {
      return
    }
    const err = e as { data?: { error?: string } }
    error.value = err?.data?.error ?? 'Не удалось загрузить подсказки'
    suggestions.value = []
    open.value = false
  } finally {
    if (currentRequest === requestId) {
      loading.value = false
    }
  }
}

function scheduleFetch(query: string) {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = setTimeout(() => {
    fetchSuggestions(query)
  }, 250)
}

function onInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  inputValue.value = value
  emitAddress(value)

  if (value.trim() !== selectedAddress.value.trim()) {
    clearCoords()
    selectedAddress.value = ''
  }

  scheduleFetch(value)
}

function onFocus() {
  if (suggestions.value.length > 0) {
    open.value = true
  } else if (inputValue.value.trim().length >= 2) {
    scheduleFetch(inputValue.value)
  }
}

function onBlur() {
  setTimeout(() => {
    open.value = false
    activeIndex.value = -1
  }, 150)
}

function onKeydown(event: KeyboardEvent) {
  if (!open.value || suggestions.value.length === 0) {
    return
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % suggestions.value.length
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    activeIndex.value = activeIndex.value <= 0
      ? suggestions.value.length - 1
      : activeIndex.value - 1
  } else if (event.key === 'Enter') {
    if (activeIndex.value >= 0) {
      event.preventDefault()
      selectSuggestion(suggestions.value[activeIndex.value])
    }
  } else if (event.key === 'Escape') {
    open.value = false
    activeIndex.value = -1
  }
}

const hasCoords = computed(() => props.lat.trim() !== '' && props.lng.trim() !== '')
const needsSelection = computed(() => props.address.trim() !== '' && !hasCoords.value)

onBeforeUnmount(() => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
})
</script>

<template>
  <div class="relative">
    <label class="mb-1 block text-sm text-gray-700">Адрес</label>
    <input
      :value="inputValue"
      type="text"
      autocomplete="off"
      class="w-full rounded border px-3 py-2 text-sm"
      placeholder="Начните вводить адрес"
      :disabled="disabled"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
      @keydown="onKeydown"
    >
    <p class="mt-1 text-xs text-gray-500">
      Выберите адрес из подсказок — координаты для карты подставятся автоматически
    </p>

    <div
      v-if="open && suggestions.length > 0"
      class="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded border border-gray-200 bg-white shadow-lg"
    >
      <button
        v-for="(item, index) in suggestions"
        :key="`${item.address}-${index}`"
        type="button"
        class="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
        :class="index === activeIndex ? 'bg-gray-50' : ''"
        @mousedown.prevent="selectSuggestion(item)"
      >
        {{ item.address }}
      </button>
    </div>

    <p
      v-if="loading"
      class="mt-1 text-xs text-gray-500"
    >
      Ищем адреса…
    </p>
    <p
      v-else-if="error"
      class="mt-1 text-xs text-red-600"
    >
      {{ error }}
    </p>
    <p
      v-else-if="hasCoords"
      class="mt-1 text-xs text-gray-500 font-mono"
    >
      Координаты: {{ lat }}, {{ lng }}
    </p>
    <p
      v-else-if="needsSelection"
      class="mt-1 text-xs text-amber-600"
    >
      Выберите адрес из списка подсказок, чтобы точка отображалась на карте
    </p>
  </div>
</template>
