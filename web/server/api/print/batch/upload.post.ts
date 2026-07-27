import { OrderStatus } from '@prisma/client'
import {
  BatchLimitReachedError,
  createOrderInCollectingBatch,
  getBatchMaxFiles,
  recalculateBatchTotals,
} from '../../../utils/batch'
import { uploadOrderFile } from '../../../utils/blob'
import {
  detectDocumentKind,
  ensureFileExtension,
  mimeTypeForKind,
  sniffDocumentKind,
} from '../../../utils/file-types'
import { countPdfPages, PdfPageCountError } from '../../../utils/pdf-pages'
import { serializePrintBatch } from '../../../utils/print-batch-dto'
import {
  assertPrintRateLimit,
  requirePrintSessionUser,
} from '../../../utils/print-session'
import { prisma } from '../../../utils/prisma'

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024

export default defineEventHandler(async (event) => {
  const user = await requirePrintSessionUser(event)
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  assertPrintRateLimit(`print-upload:${user.id}:${ip}`, 20, 60_000)

  const form = await readMultipartFormData(event)
  if (!form?.length) {
    throw createError({
      statusCode: 400,
      data: { error: 'Файл не передан', code: 'MISSING_FILE' },
    })
  }

  const filePart = form.find((part) => part.name === 'file' && part.data)
  if (!filePart?.data) {
    throw createError({
      statusCode: 400,
      data: { error: 'Файл не передан', code: 'MISSING_FILE' },
    })
  }

  if (filePart.data.length > MAX_UPLOAD_BYTES) {
    throw createError({
      statusCode: 400,
      data: { error: 'Файл слишком большой (макс. 20 МБ)', code: 'FILE_TOO_LARGE' },
    })
  }

  let fileName = (filePart.filename || 'document').trim() || 'document'
  const buffer = Buffer.from(filePart.data)
  let kind = detectDocumentKind(fileName, filePart.type)
  const sniffed = sniffDocumentKind(buffer)
  if (sniffed !== 'unsupported') {
    kind = sniffed
  }
  if (kind === 'unsupported') {
    throw createError({
      statusCode: 400,
      data: { error: 'Поддерживаются PDF и Word (DOC/DOCX)', code: 'UNSUPPORTED_FILE' },
    })
  }

  fileName = ensureFileExtension(fileName, kind)
  const mimeType = filePart.type || mimeTypeForKind(kind, fileName)
  const isWord = kind === 'word'

  let pageCount = 1
  if (!isWord) {
    try {
      pageCount = await countPdfPages(buffer)
    } catch (error) {
      throw createError({
        statusCode: 400,
        data: {
          error: error instanceof PdfPageCountError
            ? 'Не удалось прочитать PDF'
            : 'Ошибка обработки файла',
          code: 'PDF_PAGE_COUNT_FAILED',
        },
      })
    }
  }

  let pointId = user.lastPointId
  const pointSlugPart = form.find((part) => part.name === 'pointSlug')
  const pointSlug = pointSlugPart?.data ? Buffer.from(pointSlugPart.data).toString('utf8').trim() : ''
  if (pointSlug) {
    const point = await prisma.point.findFirst({
      where: { slug: pointSlug, isActive: true },
      select: { id: true },
    })
    if (point) {
      pointId = point.id
    }
  }

  let reserved
  try {
    reserved = await createOrderInCollectingBatch({
      userId: user.id,
      pointId,
      fileName,
      mimeType,
      pageCount,
      copies: 1,
      isWord,
    })
  } catch (error) {
    if (error instanceof BatchLimitReachedError) {
      throw createError({
        statusCode: 400,
        data: {
          error: `Максимум ${getBatchMaxFiles()} файлов в заказе`,
          code: 'BATCH_LIMIT',
        },
      })
    }
    throw error
  }

  const orderId = reserved.order.id
  try {
    const blob = await uploadOrderFile(orderId, buffer, {
      fileName,
      mimeType,
      kind,
    })
    await prisma.order.update({
      where: { id: orderId },
      data: { filePath: blob.url },
    })
    await prisma.orderBatch.update({
      where: { id: reserved.batch.id },
      data: { updatedAt: new Date() },
    })
    await recalculateBatchTotals(reserved.batch.id)
  } catch (error) {
    console.error('[print] upload failed:', orderId, error)
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.FAILED,
        errorMessage: 'upload failed',
      },
    }).catch(() => {})
    throw createError({
      statusCode: 500,
      data: { error: 'Не удалось сохранить файл', code: 'UPLOAD_FAILED' },
    })
  }

  const fresh = await prisma.orderBatch.findUnique({
    where: { id: reserved.batch.id },
    include: {
      orders: { orderBy: { batchIndex: 'asc' } },
      point: {
        select: {
          id: true,
          slug: true,
          name: true,
          address: true,
          displayCode: true,
          pricePerPageKopeks: true,
          citySlug: true,
        },
      },
    },
  })

  return {
    batch: fresh ? serializePrintBatch(fresh) : null,
    orderId,
  }
})
