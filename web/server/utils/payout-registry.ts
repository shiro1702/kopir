import type { PartnerPayoutRow } from './partner-balance'
import { isRequisitesComplete } from './partner-requisites'

export type RegistryFormat = 'txt' | 'xml' | '1c'

/** Payer (agent) bank details, from runtime config. */
export type RegistryPayer = {
  name: string
  inn: string
  account: string
  bik: string
  bankName: string
  corrAccount: string
}

export type RegistryEntry = {
  partnerId: string
  legalName: string
  inn: string
  accountNumber: string
  bik: string
  amountKopeks: number
  purpose: string
}

export type RegistrySkipped = {
  partnerId: string
  name: string | null
  reason: string
}

export type RegistryMeta = {
  /** Human-readable period, used in the payment purpose, e.g. «июль 2026». */
  periodLabel: string
  /** Registry generation date; defaults to now. */
  createdAt?: Date
  /** Optional first/last dates for the 1C header. */
  periodFrom?: Date | null
  periodTo?: Date | null
}

/** Formats kopeks as rubles with two decimals, e.g. 700050 -> "7000.50". */
export function formatRublesAmount(kopeks: number): string {
  return (kopeks / 100).toFixed(2)
}

export function buildPaymentPurpose(periodLabel: string): string {
  return `Выплата вознаграждения принципалу по отчёту агента за ${periodLabel}. Без НДС.`
}

/** Splits payout rows into valid registry entries and skipped rows (incomplete requisites). */
export function buildRegistryEntries(
  rows: PartnerPayoutRow[],
  periodLabel: string,
): { entries: RegistryEntry[], skipped: RegistrySkipped[] } {
  const entries: RegistryEntry[] = []
  const skipped: RegistrySkipped[] = []
  const purpose = buildPaymentPurpose(periodLabel)

  for (const row of rows) {
    if (row.balanceKopeks <= 0) {
      skipped.push({ partnerId: row.partnerId, name: row.name, reason: 'Нулевой баланс' })
      continue
    }
    if (!isRequisitesComplete(row.requisites)) {
      skipped.push({ partnerId: row.partnerId, name: row.name, reason: 'Реквизиты не заполнены' })
      continue
    }
    entries.push({
      partnerId: row.partnerId,
      legalName: row.requisites.legalName,
      inn: row.requisites.inn,
      accountNumber: row.requisites.accountNumber,
      bik: row.requisites.bik,
      amountKopeks: row.balanceKopeks,
      purpose,
    })
  }

  return { entries, skipped }
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function formatDate(date: Date): string {
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`
}

function formatTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/**
 * Tab-separated review registry with a header row.
 * Columns: name, INN, account, BIK, amount (rubles), purpose.
 */
export function buildRegistryTxt(entries: RegistryEntry[]): string {
  const header = ['Получатель', 'ИНН', 'Расчётный счёт', 'БИК', 'Сумма', 'Назначение платежа']
  const lines = [header.join('\t')]
  for (const e of entries) {
    lines.push([
      e.legalName,
      e.inn,
      e.accountNumber,
      e.bik,
      formatRublesAmount(e.amountKopeks),
      e.purpose,
    ].join('\t'))
  }
  return lines.join('\r\n')
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * XML payout registry (one <Payment> per recipient under a shared <Payer>).
 *
 * NOTE: T-Business updates its mass-payout template periodically. Before the first
 * production run, download the current template from the T-Business dashboard and
 * align element names if the bank rejects this layout. The tab-separated TXT export
 * works as a fallback for manual entry.
 */
export function buildRegistryXml(
  payer: RegistryPayer,
  entries: RegistryEntry[],
  meta: RegistryMeta,
): string {
  const createdAt = meta.createdAt ?? new Date()
  const totalKopeks = entries.reduce((sum, e) => sum + e.amountKopeks, 0)

  const paymentNodes = entries.map((e, index) => [
    '  <Payment>',
    `    <Number>${index + 1}</Number>`,
    `    <Date>${formatDate(createdAt)}</Date>`,
    `    <Amount>${formatRublesAmount(e.amountKopeks)}</Amount>`,
    `    <RecipientName>${xmlEscape(e.legalName)}</RecipientName>`,
    `    <RecipientInn>${xmlEscape(e.inn)}</RecipientInn>`,
    `    <RecipientAccount>${xmlEscape(e.accountNumber)}</RecipientAccount>`,
    `    <RecipientBik>${xmlEscape(e.bik)}</RecipientBik>`,
    `    <Purpose>${xmlEscape(e.purpose)}</Purpose>`,
    '  </Payment>',
  ].join('\n'))

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<PayoutRegistry>',
    '  <Payer>',
    `    <Name>${xmlEscape(payer.name)}</Name>`,
    `    <Inn>${xmlEscape(payer.inn)}</Inn>`,
    `    <Account>${xmlEscape(payer.account)}</Account>`,
    `    <Bik>${xmlEscape(payer.bik)}</Bik>`,
    `    <BankName>${xmlEscape(payer.bankName)}</BankName>`,
    `    <CorrAccount>${xmlEscape(payer.corrAccount)}</CorrAccount>`,
    '  </Payer>',
    `  <CreatedAt>${formatDate(createdAt)} ${formatTime(createdAt)}</CreatedAt>`,
    `  <Period>${xmlEscape(meta.periodLabel)}</Period>`,
    `  <Count>${entries.length}</Count>`,
    `  <Total>${formatRublesAmount(totalKopeks)}</Total>`,
    ...paymentNodes,
    '</PayoutRegistry>',
    '',
  ].join('\n')
}

/**
 * 1CClientBankExchange plaintext registry (de-facto import format for 1C / bank-client).
 * Served with a .txt extension; UTF-8 encoded (accepted by T-Business).
 */
export function buildRegistry1C(
  payer: RegistryPayer,
  entries: RegistryEntry[],
  meta: RegistryMeta,
): string {
  const createdAt = meta.createdAt ?? new Date()
  const lines: string[] = [
    '1CClientBankExchange',
    'ВерсияФормата=1.03',
    'Кодировка=UTF-8',
    `Отправитель=${payer.name}`,
    'Получатель=',
    `ДатаСоздания=${formatDate(createdAt)}`,
    `ВремяСоздания=${formatTime(createdAt)}`,
    `ДатаНачала=${meta.periodFrom ? formatDate(meta.periodFrom) : formatDate(createdAt)}`,
    `ДатаКонца=${meta.periodTo ? formatDate(meta.periodTo) : formatDate(createdAt)}`,
    `РасчСчет=${payer.account}`,
  ]

  entries.forEach((e, index) => {
    lines.push(
      'СекцияДокумент=Платежное поручение',
      `Номер=${index + 1}`,
      `Дата=${formatDate(createdAt)}`,
      `Сумма=${formatRublesAmount(e.amountKopeks)}`,
      `ПлательщикСчет=${payer.account}`,
      `ПлательщикИНН=${payer.inn}`,
      `Плательщик1=${payer.name}`,
      `ПлательщикРасчСчет=${payer.account}`,
      `ПлательщикБанк1=${payer.bankName}`,
      `ПлательщикБИК=${payer.bik}`,
      `ПлательщикКорсчет=${payer.corrAccount}`,
      `ПолучательСчет=${e.accountNumber}`,
      `ПолучательИНН=${e.inn}`,
      `Получатель1=${e.legalName}`,
      `ПолучательРасчСчет=${e.accountNumber}`,
      `ПолучательБИК=${e.bik}`,
      `НазначениеПлатежа=${e.purpose}`,
      'КонецДокумента',
    )
  })

  lines.push('КонецФайла', '')
  return lines.join('\r\n')
}
