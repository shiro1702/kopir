import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildPointClientLinks, type PointClientLinksConfig } from './point-links.ts'
import { generateStyledPointQrPng } from './point-qr.ts'

const baseConfig: PointClientLinksConfig = {
  telegramBotUsername: 'kopir_bot',
  telegramBotToken: 'tg-token',
  maxBotLink: 'https://max.ru/kopir_bot',
  maxBotUsername: '',
  maxBotToken: 'max-token',
  siteUrl: 'https://kopir-seven.vercel.app',
}

describe('point-qr', () => {
  it('generates styled telegram QR PNG with logo', async () => {
    const links = buildPointClientLinks('point_bgu_1', baseConfig)
    const png = await generateStyledPointQrPng(links.telegramDeepLink!, 'telegram', 300)
    assert.ok(png.byteLength > 2000)
    assert.equal(png[0], 0x89)
    assert.equal(png[1], 0x50)
  })

  it('generates styled max QR PNG with logo', async () => {
    const links = buildPointClientLinks('point_bgu_1', baseConfig)
    const png = await generateStyledPointQrPng(links.maxDeepLink!, 'max', 300)
    assert.ok(png.byteLength > 2000)
  })
})
