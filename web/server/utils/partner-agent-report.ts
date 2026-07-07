import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { PartnerBalanceEntryType } from '@prisma/client'
import { loadReportFontBold, loadReportFontRegular } from './pdf-font'
import { parsePartnerRequisites } from './partner-requisites'
import { prisma } from './prisma'

const MONTHS_RU = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
]

export type AgentReportDay = {
  date: string
  paymentsKopeks: number
  commissionKopeks: number
  partnerShareKopeks: number
}

export type AgentReportData = {
  partnerName: string
  partnerLegalName: string | null
  monthLabel: string
  totalPaymentsKopeks: number
  agentCommissionKopeks: number
  partnerShareKopeks: number
  days: AgentReportDay[]
}

/** Parses a `YYYY-MM` string into the [start, end) range for that month. */
export function parseMonthRange(month: string): { start: Date, end: Date, label: string } {
  const match = /^(\d{4})-(\d{2})$/.exec(month.trim())
  if (!match) {
    throw createError({
      statusCode: 400,
      data: { error: 'month must be in YYYY-MM format', code: 'INVALID_MONTH' },
    })
  }
  const year = Number(match[1])
  const monthIndex = Number(match[2]) - 1
  if (monthIndex < 0 || monthIndex > 11) {
    throw createError({
      statusCode: 400,
      data: { error: 'month must be between 01 and 12', code: 'INVALID_MONTH' },
    })
  }
  const start = new Date(year, monthIndex, 1)
  const end = new Date(year, monthIndex + 1, 1)
  return { start, end, label: `${MONTHS_RU[monthIndex]} ${year}` }
}

export async function getPartnerAgentReport(partnerId: string, month: string): Promise<AgentReportData> {
  const partner = await prisma.partner.findUnique({ where: { id: partnerId } })
  if (!partner) {
    throw createError({
      statusCode: 404,
      data: { error: 'Partner not found', code: 'NOT_FOUND' },
    })
  }

  const { start, end, label } = parseMonthRange(month)

  const credits = await prisma.partnerBalanceEntry.findMany({
    where: {
      partnerId,
      type: PartnerBalanceEntryType.CREDIT,
      createdAt: { gte: start, lt: end },
      batchId: { not: null },
    },
    select: { amountKopeks: true, createdAt: true, batchId: true },
    orderBy: { createdAt: 'asc' },
  })

  const batchIds = credits.map((c) => c.batchId).filter((id): id is string => Boolean(id))
  const batches = batchIds.length > 0
    ? await prisma.orderBatch.findMany({
      where: { id: { in: batchIds } },
      select: { id: true, totalAmountKopeks: true },
    })
    : []
  const totalByBatch = new Map(batches.map((b) => [b.id, b.totalAmountKopeks]))

  const dayMap = new Map<string, AgentReportDay>()
  let totalPaymentsKopeks = 0
  let partnerShareKopeks = 0

  for (const credit of credits) {
    const paymentsKopeks = credit.batchId ? (totalByBatch.get(credit.batchId) ?? credit.amountKopeks) : credit.amountKopeks
    const share = credit.amountKopeks
    const commission = Math.max(0, paymentsKopeks - share)

    totalPaymentsKopeks += paymentsKopeks
    partnerShareKopeks += share

    const key = credit.createdAt.toLocaleDateString('ru-RU')
    const day = dayMap.get(key) ?? { date: key, paymentsKopeks: 0, commissionKopeks: 0, partnerShareKopeks: 0 }
    day.paymentsKopeks += paymentsKopeks
    day.commissionKopeks += commission
    day.partnerShareKopeks += share
    dayMap.set(key, day)
  }

  return {
    partnerName: partner.name ?? 'Партнёр',
    partnerLegalName: parsePartnerRequisites(partner.requisites)?.legalName ?? null,
    monthLabel: label,
    totalPaymentsKopeks,
    agentCommissionKopeks: Math.max(0, totalPaymentsKopeks - partnerShareKopeks),
    partnerShareKopeks,
    days: [...dayMap.values()],
  }
}

const A4_WIDTH = 595.28
const A4_HEIGHT = 841.89

function rub(kopeks: number): string {
  return `${(kopeks / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} \u20bd`
}

export type AgentReportAgent = {
  name: string
  inn: string
}

export async function generateAgentReportPdf(
  data: AgentReportData,
  agent: AgentReportAgent,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const font = await pdf.embedFont(loadReportFontRegular(), { subset: true })
  const fontBold = await pdf.embedFont(loadReportFontBold(), { subset: true })

  const black = rgb(0, 0, 0)
  const gray = rgb(0.35, 0.35, 0.35)
  const line = rgb(0.8, 0.8, 0.8)

  let page = pdf.addPage([A4_WIDTH, A4_HEIGHT])
  const marginX = 48
  let y = A4_HEIGHT - 56

  page.drawText(`Отчёт агента за ${data.monthLabel}`, {
    x: marginX, y, size: 18, font: fontBold, color: black,
  })
  y -= 26

  const agentLine = agent.inn ? `Агент: ${agent.name} (ИНН ${agent.inn})` : `Агент: ${agent.name}`
  page.drawText(agentLine, { x: marginX, y, size: 10, font, color: gray })
  y -= 16
  const principalName = data.partnerLegalName ?? data.partnerName
  page.drawText(`Принципал: ${principalName}`, { x: marginX, y, size: 10, font, color: gray })
  y -= 28

  const summary = `Агент за ${data.monthLabel} принял платежей ${rub(data.totalPaymentsKopeks)}. `
    + `Комиссия агента ${rub(data.agentCommissionKopeks)}. `
    + `К выплате принципалу ${rub(data.partnerShareKopeks)}. `
    + `Детализация по дням — в таблице ниже.`

  y = drawWrapped(page, summary, marginX, y, A4_WIDTH - marginX * 2, 11, font, black, 15)
  y -= 14

  const cols = [
    { label: 'Дата', x: marginX, w: 120 },
    { label: 'Платежи', x: marginX + 120, w: 150 },
    { label: 'Комиссия', x: marginX + 270, w: 110 },
    { label: 'К выплате', x: marginX + 380, w: 120 },
  ]

  const drawHeader = () => {
    for (const col of cols) {
      page.drawText(col.label, { x: col.x, y, size: 10, font: fontBold, color: black })
    }
    y -= 6
    page.drawLine({ start: { x: marginX, y }, end: { x: A4_WIDTH - marginX, y }, thickness: 0.5, color: line })
    y -= 14
  }
  drawHeader()

  const drawRow = (cells: string[], boldRow = false) => {
    if (y < 60) {
      page = pdf.addPage([A4_WIDTH, A4_HEIGHT])
      y = A4_HEIGHT - 56
      drawHeader()
    }
    const rowFont = boldRow ? fontBold : font
    cells.forEach((cell, i) => {
      page.drawText(cell, { x: cols[i].x, y, size: 10, font: rowFont, color: black })
    })
    y -= 16
  }

  if (data.days.length === 0) {
    page.drawText('Платежей за период не найдено.', { x: marginX, y, size: 10, font, color: gray })
    y -= 16
  } else {
    for (const day of data.days) {
      drawRow([day.date, rub(day.paymentsKopeks), rub(day.commissionKopeks), rub(day.partnerShareKopeks)])
    }
    y -= 4
    page.drawLine({ start: { x: marginX, y: y + 8 }, end: { x: A4_WIDTH - marginX, y: y + 8 }, thickness: 0.5, color: line })
    drawRow(['Итого', rub(data.totalPaymentsKopeks), rub(data.agentCommissionKopeks), rub(data.partnerShareKopeks)], true)
  }

  return pdf.save()
}

function drawWrapped(
  page: ReturnType<PDFDocument['addPage']>,
  text: string,
  x: number,
  startY: number,
  maxWidth: number,
  size: number,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
  color: ReturnType<typeof rgb>,
  lineHeight: number,
): number {
  const words = text.split(' ')
  let currentLine = ''
  let y = startY
  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && currentLine) {
      page.drawText(currentLine, { x, y, size, font, color })
      y -= lineHeight
      currentLine = word
    } else {
      currentLine = candidate
    }
  }
  if (currentLine) {
    page.drawText(currentLine, { x, y, size, font, color })
    y -= lineHeight
  }
  return y
}
