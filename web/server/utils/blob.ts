import { del, put } from '@vercel/blob'
import { extensionForKind, type DocumentKind } from './file-types'

function getBlobToken(): string {
  const config = useRuntimeConfig()
  const token = config.blobReadWriteToken
  if (!token) {
    throw createError({
      statusCode: 500,
      data: { error: 'Blob storage not configured', code: 'BLOB_NOT_CONFIGURED' },
    })
  }
  return token
}

export interface UploadOrderFileOptions {
  fileName: string
  mimeType: string
  kind: DocumentKind
}

export async function uploadOrderFile(
  orderId: string,
  data: Buffer | ArrayBuffer,
  options: UploadOrderFileOptions,
) {
  const token = getBlobToken()
  const ext = extensionForKind(options.kind, options.fileName)
  const pathname = `orders/${orderId}${ext}`
  return put(pathname, data, {
    access: 'public',
    token,
    contentType: options.mimeType,
    addRandomSuffix: false,
  })
}

/** @deprecated Use uploadOrderFile */
export async function uploadOrderPdf(orderId: string, data: Buffer | ArrayBuffer) {
  return uploadOrderFile(orderId, data, {
    fileName: 'document.pdf',
    mimeType: 'application/pdf',
    kind: 'pdf',
  })
}

export async function downloadOrderFile(filePath: string): Promise<Buffer> {
  const response = await fetch(filePath)
  if (!response.ok) {
    throw createError({
      statusCode: 404,
      data: { error: 'File not found in blob storage', code: 'FILE_NOT_FOUND' },
    })
  }
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/** @deprecated Use downloadOrderFile */
export async function downloadOrderPdf(filePath: string): Promise<Buffer> {
  return downloadOrderFile(filePath)
}

export async function deleteOrderFile(filePath: string) {
  const token = getBlobToken()
  try {
    await del(filePath, { token })
  } catch (error) {
    console.error('[blob] delete failed:', filePath, error)
  }
}

/** @deprecated Use deleteOrderFile */
export async function deleteOrderPdf(filePath: string) {
  return deleteOrderFile(filePath)
}
