import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { formatPartnerPrintFailed } from './bot/partner-messages.ts'

describe('formatPartnerPrintFailed', () => {
  const order = {
    id: 'clorder1234567890',
    fileName: 'essay.pdf',
    batchId: null as string | null,
    point: { name: 'БГУ Смолина' },
  }

  it('includes order id, file and point', () => {
    const text = formatPartnerPrintFailed(order)
    assert.match(text, /7890/)
    assert.match(text, /essay\.pdf/)
    assert.match(text, /БГУ Смолина/)
    assert.match(text, /скачайте и распечатайте вручную/i)
    assert.match(text, /Ручная печать/)
    assert.match(text, /Попробовать снова/)
  })

  it('includes batch line and error reason when present', () => {
    const text = formatPartnerPrintFailed(
      { ...order, batchId: 'clbatch1234567890' },
      'Printer offline',
    )
    assert.match(text, /Пачка #567890/)
    assert.match(text, /Printer offline/)
  })
})
