import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import QRCode from 'qrcode'
import type { PointClientLinks } from './point-links'
import { loadReportFontBold, loadReportFontRegular } from './pdf-font'

const A4_WIDTH = 595.28
const A4_HEIGHT = 841.89

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

export async function generatePointPosterPdf(options: {
  pointName: string
  pricePerPageKopeks: number
  links: PointClientLinks
  telegramBotUsername: string | null
}): Promise<Uint8Array> {
  const { pointName, pricePerPageKopeks, links, telegramBotUsername } = options
  if (!links.telegramDeepLink) {
    throw createError({
      statusCode: 503,
      data: { error: 'Telegram deep link is not configured', code: 'LINK_NOT_CONFIGURED' },
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
    x: 48,
    y,
    size: 22,
    font: fontBold,
    color: black,
  })
  y -= 36

  page.drawText(pointName, {
    x: 48,
    y,
    size: 16,
    font: fontBold,
    color: black,
    maxWidth: A4_WIDTH - 96,
  })
  y -= 28

  const tgQrBytes = await qrPngBytes(links.telegramDeepLink, 400)
  const tgQrImage = await pdf.embedPng(tgQrBytes)
  const tgQrSize = 220
  const tgQrX = (A4_WIDTH - tgQrSize) / 2
  page.drawImage(tgQrImage, {
    x: tgQrX,
    y: y - tgQrSize,
    width: tgQrSize,
    height: tgQrSize,
  })

  if (links.maxDeepLink) {
    const maxQrBytes = await qrPngBytes(links.maxDeepLink, 160)
    const maxQrImage = await pdf.embedPng(maxQrBytes)
    const maxQrSize = 72
    page.drawImage(maxQrImage, {
      x: A4_WIDTH - 48 - maxQrSize,
      y: 48,
      width: maxQrSize,
      height: maxQrSize,
    })
    page.drawText('MAX', {
      x: A4_WIDTH - 48 - maxQrSize,
      y: 40,
      size: 8,
      font,
      color: gray,
    })
  }

  y -= tgQrSize + 24

  const steps = [
    '1. Отсканируйте QR-код',
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

  const botLabel = telegramBotUsername ? `@${telegramBotUsername}` : 'Telegram-бот Kopir'
  const footer = `${botLabel} · от ${formatRubles(pricePerPageKopeks)}/стр.`
  page.drawText(footer, {
    x: 48,
    y: 72,
    size: 10,
    font,
    color: gray,
  })

  return pdf.save()
}
