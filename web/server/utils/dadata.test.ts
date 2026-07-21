import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { mapDadataSuggestions, resolveDadataCityFilter } from './dadata'

describe('resolveDadataCityFilter', () => {
  it('maps known city slugs', () => {
    assert.equal(resolveDadataCityFilter('ulan-ude'), 'Улан-Удэ')
    assert.equal(resolveDadataCityFilter('ULAN-UDE'), 'Улан-Удэ')
  })

  it('returns undefined for unknown slugs', () => {
    assert.equal(resolveDadataCityFilter('moscow'), undefined)
    assert.equal(resolveDadataCityFilter(''), undefined)
    assert.equal(resolveDadataCityFilter(null), undefined)
  })
})

describe('mapDadataSuggestions', () => {
  it('maps address and coordinates from DaData payload', () => {
    const result = mapDadataSuggestions({
      suggestions: [
        {
          value: 'г Улан-Удэ, ул Ленина, д 1',
          data: { geo_lat: '51.8335', geo_lon: '107.5841' },
        },
        {
          value: 'без координат',
          data: {},
        },
      ],
    })

    assert.deepEqual(result, [
      { address: 'г Улан-Удэ, ул Ленина, д 1', lat: 51.8335, lng: 107.5841 },
      { address: 'без координат', lat: null, lng: null },
    ])
  })
})
