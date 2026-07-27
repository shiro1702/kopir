import {
  assertPrintRateLimit,
  ensureGuestPrintSession,
} from '../../utils/print-session'
import { getActiveCollectingBatch } from '../../utils/batch'
import { serializePrintBatch } from '../../utils/print-batch-dto'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  assertPrintRateLimit(`print-session:${ip}`, 30, 60_000)

  const user = await ensureGuestPrintSession(event)
  const batch = await getActiveCollectingBatch(user.id)

  let serialized = null
  if (batch) {
    const fresh = await prisma.orderBatch.findUnique({
      where: { id: batch.id },
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
    serialized = fresh ? serializePrintBatch(fresh) : null
  }

  return {
    userId: user.id,
    preferredPointSlug: user.preferredPointSlug,
    batch: serialized,
  }
})
