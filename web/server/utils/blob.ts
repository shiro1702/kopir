import { del, get, put } from '@vercel/blob'
import type { BlobCommandOptions } from '@vercel/blob'
import { extensionForKind, type DocumentKind } from './file-types'

const BLOB_ACCESS = 'private' as const

function getBlobAuthOptions(): BlobCommandOptions {
  const config = useRuntimeConfig()
  const storeId = (process.env.BLOB_STORE_ID ?? config.blobStoreId)?.trim()

  if (!storeId) {
    throw createError({
      statusCode: 500,
      data: {
        error: 'BLOB_STORE_ID is not set. In Vercel: Storage → Blob → Connect to Project.',
        code: 'BLOB_NOT_CONFIGURED',
      },
    })
  }

  // SDK resolves OIDC from Vercel runtime (x-vercel-oidc-token header or VERCEL_OIDC_TOKEN).
  // VERCEL_OIDC_TOKEN is not listed in the dashboard — it is injected per deployment.
  return { storeId }
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
  const ext = extensionForKind(options.kind, options.fileName)
  const pathname = `orders/${orderId}${ext}`
  return put(pathname, data, {
    ...getBlobAuthOptions(),
    access: BLOB_ACCESS,
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

export async function downloadOrderFile(filePathOrUrl: string): Promise<Buffer> {
  if (!filePathOrUrl?.trim()) {
    throw createError({
      statusCode: 500,
      data: { error: 'Order file path is empty', code: 'FILE_PATH_MISSING' },
    })
  }

  let result
  try {
    result = await get(filePathOrUrl, {
      ...getBlobAuthOptions(),
      access: BLOB_ACCESS,
    })
  } catch (error) {
    console.error('[blob] download failed:', filePathOrUrl, error)
    throw createError({
      statusCode: 500,
      data: {
        error: 'Failed to read file from blob storage. Check BLOB_STORE_ID and Blob store connection on Vercel.',
        code: 'BLOB_DOWNLOAD_FAILED',
      },
    })
  }

  if (!result || result.statusCode !== 200 || !result.stream) {
    throw createError({
      statusCode: 404,
      data: { error: 'File not found in blob storage', code: 'FILE_NOT_FOUND' },
    })
  }

  const arrayBuffer = await new Response(result.stream).arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/** @deprecated Use downloadOrderFile */
export async function downloadOrderPdf(filePath: string): Promise<Buffer> {
  return downloadOrderFile(filePath)
}

export async function deleteOrderFile(filePathOrUrl: string) {
  try {
    await del(filePathOrUrl, getBlobAuthOptions())
  } catch (error) {
    console.error('[blob] delete failed:', filePathOrUrl, error)
  }
}

/** @deprecated Use deleteOrderFile */
export async function deleteOrderPdf(filePath: string) {
  return deleteOrderFile(filePath)
}
