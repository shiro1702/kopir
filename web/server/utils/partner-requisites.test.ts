import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  formatRequisitesForDisplay,
  isRequisitesComplete,
  parsePartnerRequisites,
  validatePartnerRequisites,
} from './partner-requisites.ts'

describe('partner-requisites', () => {
  it('parsePartnerRequisites returns null for empty or non-object input', () => {
    assert.equal(parsePartnerRequisites(null), null)
    assert.equal(parsePartnerRequisites(undefined), null)
    assert.equal(parsePartnerRequisites([]), null)
  })

  it('parsePartnerRequisites normalizes digits and trims name', () => {
    const req = parsePartnerRequisites({
      legalName: '  ИП Иванов  ',
      inn: '77-23 45 678901',
      accountNumber: '4080 2810 1000 0001 2345',
      bik: '044 525 225',
    })
    assert.deepEqual(req, {
      legalName: 'ИП Иванов',
      inn: '772345678901',
      accountNumber: '40802810100000012345',
      bik: '044525225',
    })
  })

  it('isRequisitesComplete validates field lengths', () => {
    assert.equal(isRequisitesComplete(null), false)
    assert.equal(isRequisitesComplete({
      legalName: 'ИП', inn: '7712345678', accountNumber: '40802810100000012345', bik: '044525225',
    }), true)
    assert.equal(isRequisitesComplete({
      legalName: 'ИП', inn: '123', accountNumber: '40802810100000012345', bik: '044525225',
    }), false)
    assert.equal(isRequisitesComplete({
      legalName: '', inn: '7712345678', accountNumber: '40802810100000012345', bik: '044525225',
    }), false)
  })

  it('validatePartnerRequisites accepts valid 10- and 12-digit INN', () => {
    const a = validatePartnerRequisites({
      legalName: 'ООО Ромашка', inn: '7701234567', accountNumber: '40702810400000022222', bik: '044525593',
    })
    assert.equal(a.inn, '7701234567')
    const b = validatePartnerRequisites({
      legalName: 'ИП Иванов', inn: '500100732259', accountNumber: '40802810300000011111', bik: '044525974',
    })
    assert.equal(b.inn, '500100732259')
  })

  it('validatePartnerRequisites throws on invalid fields', () => {
    assert.throws(() => validatePartnerRequisites({
      legalName: '', inn: '7701234567', accountNumber: '40702810400000022222', bik: '044525593',
    }))
    assert.throws(() => validatePartnerRequisites({
      legalName: 'ООО', inn: '123', accountNumber: '40702810400000022222', bik: '044525593',
    }))
    assert.throws(() => validatePartnerRequisites({
      legalName: 'ООО', inn: '7701234567', accountNumber: '123', bik: '044525593',
    }))
    assert.throws(() => validatePartnerRequisites({
      legalName: 'ООО', inn: '7701234567', accountNumber: '40702810400000022222', bik: '12',
    }))
  })

  it('formatRequisitesForDisplay renders a placeholder or multi-line view', () => {
    assert.equal(formatRequisitesForDisplay(null), 'Реквизиты не заполнены')
    const text = formatRequisitesForDisplay({
      legalName: 'ИП Иванов', inn: '7712345678', accountNumber: '40802810100000012345', bik: '044525225',
    })
    assert.match(text, /ИП Иванов/)
    assert.match(text, /ИНН: 7712345678/)
    assert.match(text, /БИК: 044525225/)
  })
})
