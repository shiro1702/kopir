export const DEFAULT_POINT_SLUG = 'point_dev_1'

/** Strip legacy `point_` prefix from deep link payloads (e.g. `point_test` → `test`). */
export function normalizePointStartPayload(payload: string): string {
  const trimmed = payload.trim()
  if (trimmed.startsWith('point_')) {
    return trimmed.slice('point_'.length)
  }
  return trimmed
}
