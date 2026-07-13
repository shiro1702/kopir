import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import QRCode from 'qrcode'
import { buildPointClientLinks, type PointClientLinksConfig } from './point-links.ts'

const baseConfig: PointClientLinksConfig = {
  telegramBotUsername: 'kopir_bot',
  telegramBotToken: 'tg-token',
  maxBotLink: 'https://max.ru/kopir_bot',
  maxBotUsername: '',
  maxBotToken: 'max-token',
  siteUrl: 'https://kopir-seven.vercel.app',
}

describe('point-links QR', () => {
  it('generates PNG buffer for telegram deep link', async () => {
    const links = buildPointClientLinks('point_bgu_1', baseConfig)
    assert.ok(links.telegramDeepLink)
    const png = await QRCode.toBuffer(links.telegramDeepLink!, {
      type: 'png',
      width: 300,
      errorCorrectionLevel: 'H',
      margin: 2,
    })
    assert.ok(png.byteLength > 1000)
    assert.equal(links.telegramDeepLink, 'https://t.me/kopir_bot?start=point_bgu_1')
  })

  it('generates PNG buffer for max deep link', async () => {
    const links = buildPointClientLinks('point_bgu_1', baseConfig)
    assert.ok(links.maxDeepLink)
    const png = await QRCode.toBuffer(links.maxDeepLink!, {
      type: 'png',
      width: 300,
      errorCorrectionLevel: 'H',
      margin: 2,
    })
    assert.ok(png.byteLength > 1000)
    assert.equal(links.maxDeepLink, 'https://max.ru/kopir_bot?start=point_bgu_1')
  })
})
