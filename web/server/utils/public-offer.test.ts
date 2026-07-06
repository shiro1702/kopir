import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildPublicOfferUrl } from './public-offer.ts'

describe('buildPublicOfferUrl', () => {
  it('appends /offer to site base', () => {
    assert.equal(buildPublicOfferUrl('https://kopir.ru'), 'https://kopir.ru/offer')
    assert.equal(buildPublicOfferUrl('https://kopir.ru/'), 'https://kopir.ru/offer')
  })

  it('returns relative path when site url is empty', () => {
    assert.equal(buildPublicOfferUrl(''), '/offer')
  })
})
