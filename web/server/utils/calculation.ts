import { OrderStatus } from '@prisma/client'
import { prisma } from './prisma'

export function getPricePerPageKopeks(): number {
  const config = useRuntimeConfig()
  const value = Number(config.pricePerPageKopeks)
  return Number.isFinite(value) && value > 0 ? value : 1000
}

export function getCalculationTimeoutSec(): number {
  const config = useRuntimeConfig()
  const value = Number(config.calculationTimeoutSec)
  return Number.isFinite(value) && value > 0 ? value : 300
}

const CALCULATION_TIMEOUT_MESSAGE = 'Превышено время подсчёта страниц'

export async function expireStaleCalculations(pointId?: string): Promise<void> {
  const timeoutSec = getCalculationTimeoutSec()
  const cutoff = new Date(Date.now() - timeoutSec * 1000)

  const staleOrders = await prisma.order.findMany({
    where: {
      status: OrderStatus.CALCULATING,
      updatedAt: { lt: cutoff },
      ...(pointId ? { pointId } : {}),
    },
    include: { user: true },
  })

  for (const order of staleOrders) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.CALCULATION_FAILED,
        errorMessage: CALCULATION_TIMEOUT_MESSAGE,
      },
    })

    try {
      const { notifyCalculationFailed } = await import('./bot/core')
      await notifyCalculationFailed(order.user, {
        fileName: order.fileName,
        errorMessage: CALCULATION_TIMEOUT_MESSAGE,
      })
    } catch (error) {
      console.error('[calculation] timeout notify failed:', order.id, error)
    }
  }
}

export function isCalculationTimeoutError(errorMessage: string | null | undefined): boolean {
  if (!errorMessage) {
    return false
  }
  return errorMessage === CALCULATION_TIMEOUT_MESSAGE
    || errorMessage === 'Calculation timed out'
}
