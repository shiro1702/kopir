import { del, put } from '@vercel/blob'

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

export async function uploadOrderPdf(orderId: string, data: Buffer | ArrayBuffer) {
  const token = getBlobToken()
  const pathname = `orders/${orderId}.pdf`
  return put(pathname, data, {
    access: 'public',
    token,
    contentType: 'application/pdf',
    addRandomSuffix: false,
  })
}

export async function downloadOrderPdf(filePath: string): Promise<Buffer> {
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

export async function deleteOrderPdf(filePath: string) {
  const token = getBlobToken()
  try {
    await del(filePath, { token })
  } catch (error) {
    console.error('[blob] delete failed:', filePath, error)
  }
}
