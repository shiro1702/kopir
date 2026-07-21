import { PDFDocument } from 'pdf-lib'

export class PdfPageCountError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PdfPageCountError'
  }
}

/** Count pages in a PDF buffer. Used for pricing before payment. */
export async function countPdfPages(data: Buffer | Uint8Array | ArrayBuffer): Promise<number> {
  let pdf: PDFDocument
  try {
    pdf = await PDFDocument.load(data, { ignoreEncryption: true })
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unknown error'
    throw new PdfPageCountError(`Failed to read PDF: ${detail}`)
  }

  const pageCount = pdf.getPageCount()
  if (!Number.isInteger(pageCount) || pageCount < 1) {
    throw new PdfPageCountError('PDF has no pages')
  }

  return pageCount
}
