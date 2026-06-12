import { c as createError, u as useRuntimeConfig } from '../nitro/nitro.mjs';
import { del, put } from '@vercel/blob';

function getBlobToken() {
  const config = useRuntimeConfig();
  const token = config.blobReadWriteToken;
  if (!token) {
    throw createError({
      statusCode: 500,
      data: { error: "Blob storage not configured", code: "BLOB_NOT_CONFIGURED" }
    });
  }
  return token;
}
async function uploadOrderPdf(orderId, data) {
  const token = getBlobToken();
  const pathname = `orders/${orderId}.pdf`;
  return put(pathname, data, {
    access: "public",
    token,
    contentType: "application/pdf",
    addRandomSuffix: false
  });
}
async function downloadOrderPdf(filePath) {
  const response = await fetch(filePath);
  if (!response.ok) {
    throw createError({
      statusCode: 404,
      data: { error: "File not found in blob storage", code: "FILE_NOT_FOUND" }
    });
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
async function deleteOrderPdf(filePath) {
  const token = getBlobToken();
  try {
    await del(filePath, { token });
  } catch (error) {
    console.error("[blob] delete failed:", filePath, error);
  }
}

export { downloadOrderPdf as a, deleteOrderPdf as d, uploadOrderPdf as u };
//# sourceMappingURL=blob.mjs.map
