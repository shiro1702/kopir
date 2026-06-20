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

export function sniffDocumentKind(buffer: Buffer): DocumentKind {
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString() === '%PDF') {
    return 'pdf'
  }

  if (buffer.length >= 4 && buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0) {
    return 'word'
  }

  if (buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4B) {
    return 'word'
  }

  return 'unsupported'
}

export function ensureFileExtension(fileName: string, kind: DocumentKind): string {
  const ext = getFileExtension(fileName)
  if (kind === 'pdf' && ext !== '.pdf') {
    const base = ext ? fileName.slice(0, fileName.length - ext.length) : fileName
    return `${base || 'document'}.pdf`
  }
  if (kind === 'word' && ext !== '.doc' && ext !== '.docx') {
    const base = ext ? fileName.slice(0, fileName.length - ext.length) : fileName
    return `${base || 'document'}.docx`
  }
  return fileName
}

export function guessFileNameFromUrl(url: string): string | undefined {
  try {
    const base = new URL(url).pathname.split('/').pop()
    if (!base?.includes('.')) {
      return undefined
    }
    return decodeURIComponent(base)
  } catch {
    return undefined
  }
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
