import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildPointClientLinks, type PointClientLinksConfig } from './point-links.ts'
import { generatePointPosterPdf } from './point-poster.ts'

const baseConfig: PointClientLinksConfig = {
  telegramBotUsername: 'kopir_bot',
  telegramBotToken: 'tg-token',
  maxBotLink: 'https://max.ru/kopir_bot',
  maxBotUsername: '',
  maxBotToken: 'max-token',
  siteUrl: 'https://kopir-seven.vercel.app',
}

describe('point-poster', () => {
  it('generates PDF with telegram and max QR codes', async () => {
    const links = buildPointClientLinks('point_bgu_1', baseConfig)
    const pdfBytes = await generatePointPosterPdf({
      pointName: 'Копицентр на Смолина',
      pricePerPageKopeks: 1000,
      links,
      telegramBotUsername: 'kopir_bot',
      maxBotLabel: 'kopir_bot',
    })

    assert.ok(pdfBytes.byteLength > 5000)
    const header = Buffer.from(pdfBytes.slice(0, 5)).toString('ascii')
    assert.equal(header, '%PDF-')
  })

  it('generates PDF with only max QR when telegram is missing', async () => {
    const links = buildPointClientLinks('point_bgu_1', {
      ...baseConfig,
      telegramBotUsername: null,
      telegramBotToken: null,
    })
    const pdfBytes = await generatePointPosterPdf({
      pointName: 'Копицентр MAX',
      pricePerPageKopeks: 1000,
      links,
      telegramBotUsername: null,
      maxBotLabel: 'kopir_bot',
    })

    assert.ok(pdfBytes.byteLength > 3000)
  })
})
