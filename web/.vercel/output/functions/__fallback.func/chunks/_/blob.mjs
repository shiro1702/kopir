import { c as createError, u as useRuntimeConfig } from '../nitro/nitro.mjs';
import { del, put } from '@vercel/blob';

const PDF_MIME = "application/pdf";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const DOC_MIME = "application/msword";
function getFileExtension(fileName) {
  const dot = fileName.lastIndexOf(".");
  if (dot === -1) {
    return "";
  }
  return fileName.slice(dot).toLowerCase();
}
function detectDocumentKind(fileName, mimeType) {
  const ext = getFileExtension(fileName);
  const mime = (mimeType != null ? mimeType : "").toLowerCase();
  if (mime === PDF_MIME || ext === ".pdf") {
    return "pdf";
  }
  if (mime === DOCX_MIME || mime === DOC_MIME || ext === ".docx" || ext === ".doc") {
    return "word";
  }
  return "unsupported";
}
function mimeTypeForKind(kind, fileName) {
  if (kind === "pdf") {
    return PDF_MIME;
  }
  const ext = getFileExtension(fileName);
  if (ext === ".doc") {
    return DOC_MIME;
  }
  return DOCX_MIME;
}
function extensionForKind(kind, fileName) {
  if (kind === "pdf") {
    return ".pdf";
  }
  const ext = getFileExtension(fileName);
  if (ext === ".doc" || ext === ".docx") {
    return ext;
  }
  return ".docx";
}

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
async function uploadOrderFile(orderId, data, options) {
  const token = getBlobToken();
  const ext = extensionForKind(options.kind, options.fileName);
  const pathname = `orders/${orderId}${ext}`;
  return put(pathname, data, {
    access: "public",
    token,
    contentType: options.mimeType,
    addRandomSuffix: false
  });
}
async function downloadOrderFile(filePath) {
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
async function deleteOrderFile(filePath) {
  const token = getBlobToken();
  try {
    await del(filePath, { token });
  } catch (error) {
    console.error("[blob] delete failed:", filePath, error);
  }
}

export { downloadOrderFile as a, detectDocumentKind as b, deleteOrderFile as d, mimeTypeForKind as m, uploadOrderFile as u };
//# sourceMappingURL=blob.mjs.map
