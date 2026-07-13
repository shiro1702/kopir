import { createError } from 'h3'
import { PDFDocument, type PDFFont, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import QRCode from 'qrcode'
import type { PointClientLinks } from './point-links'
import { loadReportFontBold, loadReportFontRegular } from './pdf-font'

const A4_WIDTH = 595.28
const A4_HEIGHT = 841.89
const MARGIN = 48

async function qrPngBytes(url: string, width: number): Promise<Uint8Array> {
  const buffer = await QRCode.toBuffer(url, {
    type: 'png',
    width,
    errorCorrectionLevel: 'H',
    margin: 1,
  })
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
) {
  page.drawText(text, {
    x: centeredTextX(text, font, 14, columnX, columnWidth),
    y,
    size: 14,
    font,
    color,
  })
}

function buildPosterFooter(
  telegramBotUsername: string | null,
  maxBotLabel: string | null,
  hasTelegram: boolean,
  hasMax: boolean,
  pricePerPageKopeks: number,
): string {
  const parts: string[] = []
  if (hasTelegram) {
    parts.push(telegramBotUsername ? `Telegram: @${telegramBotUsername}` : 'Telegram')
  }
  if (hasMax) {
    parts.push(maxBotLabel ? `MAX: ${maxBotLabel}` : 'MAX')
  }
  return `${parts.join(' · ')} · от ${formatRubles(pricePerPageKopeks)}/стр.`
}

export async function generatePointPosterPdf(options: {
  pointName: string
  pricePerPageKopeks: number
  links: PointClientLinks
  telegramBotUsername: string | null
  maxBotLabel?: string | null
}): Promise<Uint8Array> {
  const { pointName, pricePerPageKopeks, links, telegramBotUsername, maxBotLabel = null } = options
  const hasTelegram = Boolean(links.telegramDeepLink)
  const hasMax = Boolean(links.maxDeepLink)

  if (!hasTelegram && !hasMax) {
    throw createError({
      statusCode: 503,
      data: { error: 'No client deep links configured', code: 'LINK_NOT_CONFIGURED' },
    })
  }

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

  const dualLayout = hasTelegram && hasMax
  const qrSize = dualLayout ? 190 : 220
  const gap = 40
  const labelGap = 10

  if (dualLayout) {
    const totalWidth = qrSize * 2 + gap
    const startX = (A4_WIDTH - totalWidth) / 2
    const tgColumnX = startX
    const maxColumnX = startX + qrSize + gap

    drawPosterLabel(page, 'Telegram', tgColumnX, qrSize, y, fontBold, black)
    drawPosterLabel(page, 'MAX', maxColumnX, qrSize, y, fontBold, black)
    y -= 14 + labelGap

    const tgQrBytes = await qrPngBytes(links.telegramDeepLink!, 400)
    const maxQrBytes = await qrPngBytes(links.maxDeepLink!, 400)
    const tgQrImage = await pdf.embedPng(tgQrBytes)
    const maxQrImage = await pdf.embedPng(maxQrBytes)

    page.drawImage(tgQrImage, {
      x: tgColumnX,
      y: y - qrSize,
      width: qrSize,
      height: qrSize,
    })
    page.drawImage(maxQrImage, {
      x: maxColumnX,
      y: y - qrSize,
      width: qrSize,
      height: qrSize,
    })
    y -= qrSize + 24
  } else {
    const deepLink = hasTelegram ? links.telegramDeepLink! : links.maxDeepLink!
    const label = hasTelegram ? 'Telegram' : 'MAX'
    const columnX = (A4_WIDTH - qrSize) / 2

    drawPosterLabel(page, label, columnX, qrSize, y, fontBold, black)
    y -= 14 + labelGap

    const qrBytes = await qrPngBytes(deepLink, 400)
    const qrImage = await pdf.embedPng(qrBytes)
    page.drawImage(qrImage, {
      x: columnX,
      y: y - qrSize,
      width: qrSize,
      height: qrSize,
    })
    y -= qrSize + 24
  }

  const scanStep = hasTelegram && hasMax
    ? '1. Отсканируйте QR-код (Telegram или MAX)'
    : '1. Отсканируйте QR-код'
  const steps = [
    scanStep,
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
