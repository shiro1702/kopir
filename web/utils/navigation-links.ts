export function yandexMapsRoute(lat: number, lng: number): string {
  return `https://yandex.ru/maps/?rtext=~${lat},${lng}&rtt=auto`
}

export function doubleGisRoute(lat: number, lng: number): string {
  return `https://2gis.ru/routeSearch/rsType/car/to/${lng},${lat}`
}

export function googleMapsRoute(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}
