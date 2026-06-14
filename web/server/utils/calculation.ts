import { OrderStatus } from '@prisma/client'
import { notifyCalculationFailed } from './bot/core'
import { prisma } from './prisma'

export function getPricePerPageKopeks(): number {
  const config = useRuntimeConfig()
  const value = Number(config.pricePerPageKopeks)
  return Number.isFinite(value) && value > 0 ? value : 1000
}

export function getCalculationTimeoutSec(): number {
  const config = useRuntimeConfig()
  const value = Number(config.calculationTimeoutSec)
  return Number.isFinite(value) && value > 0 ? value : 120
}

export async function expireStaleCalculations(pointId?: string): Promise<void> {
  const timeoutSec = getCalculationTimeoutSec()
  const cutoff = new Date(Date.now() - timeoutSec * 1000)

  const staleOrders = await prisma.order.findMany({
    where: {
      status: OrderStatus.CALCULATING,
      createdAt: { lt: cutoff },
      ...(pointId ? { pointId } : {}),
    },
    include: { user: true },
  })

  for (const order of staleOrders) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.CALCULATION_FAILED,
        errorMessage: 'Calculation timed out',
      },
    })

    try {
      await notifyCalculationFailed(order.user, {
        fileName: order.fileName,
        errorMessage: 'Calculation timed out',
      })
    } catch (error) {
      console.error('[calculation] timeout notify failed:', order.id, error)
    }
  }
}
