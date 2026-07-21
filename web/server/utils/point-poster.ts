import { createError } from 'h3'
import { PDFDocument, type PDFFont, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import type { PointClientLinks } from './point-links'
import { generateStyledPointQrPng, type PointQrPlatform } from './point-qr'
import { loadReportFontBold, loadReportFontRegular } from './pdf-font'

const A4_WIDTH = 595.28
const A4_HEIGHT = 841.89
const MARGIN = 48

type PosterQrItem = {
  label: string
  url: string
  platform: PointQrPlatform
}

async function qrPngBytes(
  url: string,
  platform: PointQrPlatform,
  width: number,
): Promise<Uint8Array> {
  const buffer = await generateStyledPointQrPng(url, platform, width)
  return new Uint8Array(buffer)
}

function formatRubles(kopeks: number): string {
  return `${(kopeks / 100).toFixed(kopeks % 100 === 0 ? 0 : 2)} ₽`
}

function centeredTextX(
  text: string,
  font: PDFFont,
  size: number,
  columnX: number,
  columnWidth: number,
): number {
  const textWidth = font.widthOfTextAtSize(text, size)
  return columnX + (columnWidth - textWidth) / 2
}

function drawPosterLabel(
  page: ReturnType<PDFDocument['addPage']>,
  text: string,
  columnX: number,
  columnWidth: number,
  y: number,
  font: PDFFont,
  color: ReturnType<typeof rgb>,
  size = 14,
) {
  page.drawText(text, {
    x: centeredTextX(text, font, size, columnX, columnWidth),
    y,
    size,
    font,
    color,
  })
}

function buildPosterFooter(
  telegramBotUsername: string | null,
  maxBotLabel: string | null,
  hasTelegram: boolean,
  hasMax: boolean,
  hasGo: boolean,
  pricePerPageKopeks: number,
): string {
  const parts: string[] = []
  if (hasTelegram) {
    parts.push(telegramBotUsername ? `Telegram: @${telegramBotUsername}` : 'Telegram')
  }
  if (hasMax) {
    parts.push(maxBotLabel ? `MAX: ${maxBotLabel}` : 'MAX')
  }
  if (hasGo) {
    parts.push('Универсальный QR')
  }
  return `${parts.join(' · ')} · от ${formatRubles(pricePerPageKopeks)}/стр.`
}

function buildPosterQrItems(links: PointClientLinks): PosterQrItem[] {
  const items: PosterQrItem[] = []
  if (links.telegramDeepLink) {
    items.push({ label: 'Telegram', url: links.telegramDeepLink, platform: 'telegram' })
  }
  if (links.maxDeepLink) {
    items.push({ label: 'MAX', url: links.maxDeepLink, platform: 'max' })
  }
  if (links.goLink) {
    items.push({ label: 'Универсально', url: links.goLink, platform: 'go' })
  }
  return items
}

function buildScanStep(items: PosterQrItem[]): string {
  if (items.length === 1) {
    return '1. Отсканируйте QR-код'
  }
  const labels = items.map((item) => item.label).join(', ')
  return `1. Отсканируйте QR (${labels})`
}

export async function generatePointPosterPdf(options: {
  pointName: string
  pricePerPageKopeks: number
  links: PointClientLinks
  telegramBotUsername: string | null
  maxBotLabel?: string | null
}): Promise<Uint8Array> {
  const { pointName, pricePerPageKopeks, links, telegramBotUsername, maxBotLabel = null } = options
  const qrItems = buildPosterQrItems(links)

  if (qrItems.length === 0) {
    throw createError({
      statusCode: 503,
      data: { error: 'No client deep links configured', code: 'LINK_NOT_CONFIGURED' },
    })
  }

  const hasTelegram = Boolean(links.telegramDeepLink)
  const hasMax = Boolean(links.maxDeepLink)
  const hasGo = Boolean(links.goLink)

  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const font = await pdf.embedFont(loadReportFontRegular(), { subset: true })
  const fontBold = await pdf.embedFont(loadReportFontBold(), { subset: true })
  const page = pdf.addPage([A4_WIDTH, A4_HEIGHT])
  const black = rgb(0, 0, 0)
  const gray = rgb(0.35, 0.35, 0.35)

  let y = A4_HEIGHT - 56

  page.drawText('Печать документов — Kopir', {
    x: MARGIN,
    y,
    size: 22,
    font: fontBold,
    color: black,
  })
  y -= 36

  page.drawText(pointName, {
    x: MARGIN,
    y,
    size: 16,
    font: fontBold,
    color: black,
    maxWidth: A4_WIDTH - MARGIN * 2,
  })
  y -= 32

  const qrCount = qrItems.length
  const gap = qrCount === 3 ? 24 : 40
  const qrSize = qrCount === 3 ? 150 : qrCount === 2 ? 190 : 220
  const labelGap = 10
  const totalWidth = qrCount * qrSize + gap * (qrCount - 1)
  const startX = (A4_WIDTH - totalWidth) / 2

  for (let index = 0; index < qrItems.length; index++) {
    const item = qrItems[index]
    const columnX = startX + index * (qrSize + gap)
    drawPosterLabel(page, item.label, columnX, qrSize, y, fontBold, black, qrCount === 3 ? 12 : 14)
  }
  y -= (qrCount === 3 ? 12 : 14) + labelGap

  for (let index = 0; index < qrItems.length; index++) {
    const item = qrItems[index]
    const columnX = startX + index * (qrSize + gap)
    const qrBytes = await qrPngBytes(item.url, item.platform, 400)
    const qrImage = await pdf.embedPng(qrBytes)
    page.drawImage(qrImage, {
      x: columnX,
      y: y - qrSize,
      width: qrSize,
      height: qrSize,
    })
  }
  y -= qrSize + 24

  if (hasGo) {
    drawPosterLabel(
      page,
      'Универсальный QR — выбор мессенджера на сайте',
      MARGIN,
      A4_WIDTH - MARGIN * 2,
      y,
      font,
      gray,
      10,
    )
    y -= 18
  }

  const steps = [
    buildScanStep(qrItems),
    '2. Отправьте PDF или Word в чат',
    '3. Оплатите в боте',
    '4. Заберите распечатку у принтера',
  ]
  for (const step of steps) {
    page.drawText(step, {
      x: 72,
      y,
      size: 13,
      font,
      color: black,
    })
    y -= 22
  }

  const footer = buildPosterFooter(
    telegramBotUsername,
    maxBotLabel,
    hasTelegram,
    hasMax,
    hasGo,
    pricePerPageKopeks,
  )
  page.drawText(footer, {
    x: MARGIN,
    y: 72,
    size: 10,
    font,
    color: gray,
    maxWidth: A4_WIDTH - MARGIN * 2,
  })

  return pdf.save()
}
