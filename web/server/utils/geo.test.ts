import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { formatDistanceKm, haversineKm } from './geo'

describe('haversineKm', () => {
  it('returns zero for same point', () => {
    const km = haversineKm({ lat: 51.83, lng: 107.58 }, { lat: 51.83, lng: 107.58 })
    assert.equal(km, 0)
  })

  it('returns positive distance for nearby points', () => {
    const km = haversineKm(
      { lat: 51.8335, lng: 107.5841 },
      { lat: 51.8400, lng: 107.5900 },
    )
    assert.ok(km > 0.5 && km < 2)
  })
})

describe('formatDistanceKm', () => {
  it('formats meters under 1 km', () => {
    assert.equal(formatDistanceKm(0.85), '≈ 850 м')
  })

  it('formats kilometers', () => {
    assert.equal(formatDistanceKm(1.2), '≈ 1.2 км')
  })
})
