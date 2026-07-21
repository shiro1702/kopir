export type PublicPoint = {
  slug: string
  name: string
  displayCode: string | null
  citySlug: string
  address: string | null
  lat: number | null
  lng: number | null
  pricePerPageKopeks: number
  agentOnline: boolean
  acceptsOnlineOrders: boolean
  isOpenNow: boolean
  statusText: string
  closingSoon: boolean
  canSelect: boolean
  markerStatus: 'open' | 'closed' | 'closing' | 'offline'
  pickupInstructions: string | null
  estimatedReadyMinutes: string | null
  entryPhotoUrl: string | null
  distanceKm: number | null
  distanceText: string | null
}

export const DEFAULT_CITY_SLUG = 'ulan-ude'

export const DEFAULT_MAP_CENTER = {
  lat: 51.8335,
  lng: 107.5841,
} as const
