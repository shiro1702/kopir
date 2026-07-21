<script setup lang="ts">
import type { Map as LeafletMap, Marker } from 'leaflet'
import type { PublicPoint } from '~/types/point-picker'
import { DEFAULT_MAP_CENTER } from '~/types/point-picker'

const props = defineProps<{
  points: PublicPoint[]
  selectedSlug?: string | null
  userCoords?: { lat: number, lng: number } | null
}>()

const emit = defineEmits<{
  select: [slug: string]
  openDetail: [slug: string]
}>()

const mapRoot = ref<HTMLElement | null>(null)
let map: LeafletMap | null = null
let markers: Marker[] = []
let userMarker: Marker | null = null

const markerColors: Record<PublicPoint['markerStatus'], string> = {
  open: '#16a34a',
  closing: '#ca8a04',
  closed: '#9ca3af',
  offline: '#dc2626',
}

async function initMap() {
  if (!mapRoot.value || map) {
    return
  }
  const L = await import('leaflet')
  const center = props.userCoords ?? DEFAULT_MAP_CENTER
  map = L.map(mapRoot.value, { zoomControl: true }).setView([center.lat, center.lng], 13)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 19,
  }).addTo(map)
  syncMarkers()
}

async function syncMarkers() {
  if (!map) {
    return
  }
  const L = await import('leaflet')
  for (const marker of markers) {
    marker.remove()
  }
  markers = []

  for (const point of props.points) {
    if (point.lat == null || point.lng == null) {
      continue
    }
    const color = markerColors[point.markerStatus]
    const icon = L.divIcon({
      className: '',
      html: `<div style="width:14px;height:14px;border-radius:9999px;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3);background:${color}"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    })
    const marker = L.marker([point.lat, point.lng], { icon }).addTo(map)
    marker.on('click', () => {
      emit('openDetail', point.slug)
    })
    marker.bindPopup(`
      <strong>${point.name}</strong><br/>
      ${point.address ?? ''}<br/>
      ${point.statusText}<br/>
      ${(point.pricePerPageKopeks / 100).toLocaleString('ru-RU')} ₽/стр.
    `)
    markers.push(marker)
  }

  if (userMarker) {
    userMarker.remove()
    userMarker = null
  }
  if (props.userCoords) {
    userMarker = L.circleMarker([props.userCoords.lat, props.userCoords.lng], {
      radius: 7,
      color: '#2563eb',
      fillColor: '#3b82f6',
      fillOpacity: 0.9,
    }).addTo(map)
  }

  const coords = props.points
    .filter((p) => p.lat != null && p.lng != null)
    .map((p) => [p.lat!, p.lng!] as [number, number])
  if (coords.length > 1) {
    map.fitBounds(coords, { padding: [32, 32] })
  } else if (coords.length === 1) {
    map.setView(coords[0], 14)
  }
}

function focusPoint(point: PublicPoint | null) {
  if (!map || !point || point.lat == null || point.lng == null) {
    return
  }
  map.setView([point.lat, point.lng], 15)
}

watch(() => props.points, syncMarkers, { deep: true })
watch(() => props.selectedSlug, (slug) => {
  const point = props.points.find((p) => p.slug === slug) ?? null
  focusPoint(point)
})
watch(() => props.userCoords, async () => {
  await syncMarkers()
})

onMounted(() => {
  initMap()
})

onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
  }
})

defineExpose({ focusPoint })
</script>

<template>
  <div
    ref="mapRoot"
    class="h-full min-h-[280px] w-full rounded-2xl border border-gray-200 bg-gray-100"
  />
</template>
