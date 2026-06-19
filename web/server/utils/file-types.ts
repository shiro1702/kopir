export type DocumentKind = 'pdf' | 'word' | 'unsupported'

const PDF_MIME = 'application/pdf'
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const DOC_MIME = 'application/msword'

export function getFileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  if (dot === -1) {
    return ''
  }
  return fileName.slice(dot).toLowerCase()
}

export function detectDocumentKind(fileName: string, mimeType?: string | null): DocumentKind {
  const ext = getFileExtension(fileName)
  const mime = (mimeType ?? '').toLowerCase()

  if (mime === PDF_MIME || ext === '.pdf') {
    return 'pdf'
  }

  if (
    mime === DOCX_MIME
    || mime === DOC_MIME
    || ext === '.docx'
    || ext === '.doc'
  ) {
    return 'word'
  }

  return 'unsupported'
}

export function mimeTypeForKind(kind: DocumentKind, fileName: string): string {
  if (kind === 'pdf') {
    return PDF_MIME
  }

  const ext = getFileExtension(fileName)
  if (ext === '.doc') {
    return DOC_MIME
  }

  return DOCX_MIME
}

/** RFC 5987 — safe Content-Disposition for non-ASCII filenames (e.g. Cyrillic). */
export function contentDispositionAttachment(fileName: string): string {
  const ext = getFileExtension(fileName)
  const asciiFallback = fileName
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/["\\]/g, '_')
    .trim() || `download${ext}`
  const encoded = encodeURIComponent(fileName)
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`
}

export function extensionForKind(kind: DocumentKind, fileName: string): string {
  if (kind === 'pdf') {
    return '.pdf'
  }

  const ext = getFileExtension(fileName)
  if (ext === '.doc' || ext === '.docx') {
    return ext
  }

  return '.docx'
}
