import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { PDFDocument } from 'pdf-lib'
import { countPdfPages, PdfPageCountError } from './pdf-pages.ts'

async function makePdf(pages: number): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  for (let i = 0; i < pages; i++) {
    pdf.addPage([595, 842])
  }
  return pdf.save()
}

describe('countPdfPages', () => {
  it('counts a single-page PDF', async () => {
    const bytes = await makePdf(1)
    assert.equal(await countPdfPages(bytes), 1)
  })

  it('counts a multi-page PDF', async () => {
    const bytes = await makePdf(8)
    assert.equal(await countPdfPages(bytes), 8)
  })

  it('rejects non-PDF data', async () => {
    await assert.rejects(
      () => countPdfPages(Buffer.from('not a pdf')),
      (error: unknown) => error instanceof PdfPageCountError,
    )
  })
})
