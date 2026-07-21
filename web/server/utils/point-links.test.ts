import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildPointClientLinks, getPointClientDeepLink, resolveMaxBotDisplayLabel, type PointClientLinksConfig } from './point-links.ts'

const baseConfig: PointClientLinksConfig = {
  telegramBotUsername: 'kopir_bot',
  telegramBotToken: 'tg-token',
  maxBotLink: 'https://max.ru/kopir_bot',
  maxBotUsername: '',
  maxBotToken: 'max-token',
  siteUrl: 'https://kopir-seven.vercel.app',
}

describe('point-links', () => {
  it('builds telegram and max deep links from slug', () => {
    const links = buildPointClientLinks('point_bgu_1', baseConfig)
    assert.equal(links.slug, 'point_bgu_1')
    assert.equal(links.telegramPayload, 'point_bgu_1')
    assert.equal(links.maxPayload, 'point_bgu_1')
    assert.equal(links.telegramDeepLink, 'https://t.me/kopir_bot?start=point_bgu_1')
    assert.equal(links.maxDeepLink, 'https://max.ru/kopir_bot?start=point_bgu_1')
    assert.equal(links.goLink, 'https://kopir-seven.vercel.app/go?point=point_bgu_1')
    assert.equal(links.telegramConfigured, true)
    assert.equal(links.maxConfigured, true)
  })

  it('returns null telegram deep link without username', () => {
    const links = buildPointClientLinks('point_bgu_1', {
      ...baseConfig,
      telegramBotUsername: null,
    })
    assert.equal(links.telegramDeepLink, null)
    assert.equal(links.telegramPayload, 'point_bgu_1')
  })

  it('returns null telegram deep link without token', () => {
    const links = buildPointClientLinks('point_bgu_1', {
      ...baseConfig,
      telegramBotToken: null,
    })
    assert.equal(links.telegramDeepLink, null)
    assert.equal(links.telegramConfigured, false)
  })

  it('builds max deep link from username when link base is empty', () => {
    const links = buildPointClientLinks('point_bgu_1', {
      ...baseConfig,
      maxBotLink: '',
      maxBotUsername: 'kopir_bot',
    })
    assert.equal(links.maxDeepLink, 'https://max.ru/kopir_bot?start=point_bgu_1')
  })

  it('returns null max deep link when max is not configured', () => {
    const links = buildPointClientLinks('point_bgu_1', {
      ...baseConfig,
      maxBotToken: null,
    })
    assert.equal(links.maxDeepLink, null)
    assert.equal(links.maxConfigured, false)
  })

  it('returns null go link without site url', () => {
    const links = buildPointClientLinks('point_bgu_1', {
      ...baseConfig,
      siteUrl: '',
    })
    assert.equal(links.goLink, null)
  })

  it('resolves go deep link from links', () => {
    const links = buildPointClientLinks('point_bgu_1', baseConfig)
    assert.equal(getPointClientDeepLink(links, 'go'), links.goLink)
  })

  it('resolves max bot display label from link or username', () => {
    assert.equal(
      resolveMaxBotDisplayLabel({
        maxBotLink: 'https://max.ru/kopir_bot',
        maxBotUsername: '',
      }),
      'kopir_bot',
    )
    assert.equal(
      resolveMaxBotDisplayLabel({
        maxBotLink: '',
        maxBotUsername: '@kopir_bot',
      }),
      'kopir_bot',
    )
  })
})
