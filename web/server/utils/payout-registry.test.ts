import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { PartnerPayoutRow } from './partner-balance.ts'
import {
  buildPaymentPurpose,
  buildRegistry1C,
  buildRegistryEntries,
  buildRegistryTxt,
  buildRegistryXml,
  formatRublesAmount,
  type RegistryPayer,
} from './payout-registry.ts'

const PAYER: RegistryPayer = {
  name: 'ИП Копир',
  inn: '772345678901',
  account: '40802810100000099999',
  bik: '044525225',
  bankName: 'АО «ТБанк»',
  corrAccount: '30101810145250000974',
}

const ROWS: PartnerPayoutRow[] = [
  {
    partnerId: 'p1',
    name: 'Партнёр 1',
    balanceKopeks: 1_250_000,
    requisites: {
      legalName: 'ИП Иванов И.И.',
      inn: '500100732259',
      accountNumber: '40802810300000011111',
      bik: '044525974',
    },
    requisitesComplete: true,
    points: [{ id: 'pt1', name: 'Точка 1' }],
  },
  {
    partnerId: 'p2',
    name: 'Партнёр 2',
    balanceKopeks: 830_050,
    requisites: {
      legalName: 'ООО Ромашка',
      inn: '7701234567',
      accountNumber: '40702810400000022222',
      bik: '044525593',
    },
    requisitesComplete: true,
    points: [{ id: 'pt2', name: 'Точка 2' }],
  },
  {
    partnerId: 'p3',
    name: 'Партнёр без реквизитов',
    balanceKopeks: 500_000,
    requisites: null,
    requisitesComplete: false,
    points: [],
  },
]

const META = { periodLabel: 'июль 2026', createdAt: new Date('2026-07-07T12:00:00') }

describe('payout-registry', () => {
  it('formatRublesAmount converts kopeks to rubles with 2 decimals', () => {
    assert.equal(formatRublesAmount(1_250_000), '12500.00')
    assert.equal(formatRublesAmount(830_050), '8300.50')
    assert.equal(formatRublesAmount(1), '0.01')
  })

  it('buildRegistryEntries keeps complete rows and skips incomplete ones', () => {
    const { entries, skipped } = buildRegistryEntries(ROWS, 'июль 2026')
    assert.equal(entries.length, 2)
    assert.equal(skipped.length, 1)
    assert.equal(skipped[0].partnerId, 'p3')
    assert.equal(entries[0].amountKopeks, 1_250_000)
    assert.equal(entries[0].purpose, buildPaymentPurpose('июль 2026'))
  })

  it('buildRegistryTxt produces a header and one row per entry', () => {
    const { entries } = buildRegistryEntries(ROWS, 'июль 2026')
    const txt = buildRegistryTxt(entries)
    const lines = txt.split('\r\n')
    assert.equal(lines.length, 3)
    assert.match(lines[0], /^Получатель\tИНН/)
    assert.match(lines[1], /ИП Иванов И\.И\.\t500100732259\t40802810300000011111\t044525974\t12500\.00/)
  })

  it('buildRegistryXml includes payer, totals and a payment per entry', () => {
    const { entries } = buildRegistryEntries(ROWS, 'июль 2026')
    const xml = buildRegistryXml(PAYER, entries, META)
    assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/)
    assert.equal(xml.match(/<Payment>/g)?.length, 2)
    assert.match(xml, /<Total>20800\.50<\/Total>/)
    assert.match(xml, /<RecipientAccount>40702810400000022222<\/RecipientAccount>/)
  })

  it('buildRegistry1C emits a 1CClientBankExchange document', () => {
    const { entries } = buildRegistryEntries(ROWS, 'июль 2026')
    const doc = buildRegistry1C(PAYER, entries, META)
    assert.match(doc, /^1CClientBankExchange/)
    assert.equal(doc.match(/СекцияДокумент=Платежное поручение/g)?.length, 2)
    assert.match(doc, /Сумма=12500\.00/)
    assert.match(doc, /ПолучательИНН=7701234567/)
    assert.match(doc, /КонецФайла/)
  })

  it('buildRegistryXml escapes special characters', () => {
    const entries = [{
      partnerId: 'p',
      legalName: 'ООО "А&Б"',
      inn: '7701234567',
      accountNumber: '40702810400000022222',
      bik: '044525593',
      amountKopeks: 10000,
      purpose: 'x < y',
    }]
    const xml = buildRegistryXml(PAYER, entries, META)
    assert.match(xml, /ООО &quot;А&amp;Б&quot;/)
    assert.match(xml, /x &lt; y/)
  })
})
