import { u as useRuntimeConfig } from '../nitro/nitro.mjs';
import { p as prisma, _ as _default } from './prisma.mjs';
import { n as notifyCalculationFailed } from './order-staff-actions.mjs';

function getPricePerPageKopeks() {
  const config = useRuntimeConfig();
  const value = Number(config.pricePerPageKopeks);
  return Number.isFinite(value) && value > 0 ? value : 1e3;
}
function getCalculationTimeoutSec() {
  const config = useRuntimeConfig();
  const value = Number(config.calculationTimeoutSec);
  return Number.isFinite(value) && value > 0 ? value : 120;
}
async function expireStaleCalculations(pointId) {
  const timeoutSec = getCalculationTimeoutSec();
  const cutoff = new Date(Date.now() - timeoutSec * 1e3);
  const staleOrders = await prisma.order.findMany({
    where: {
      status: _default.OrderStatus.CALCULATING,
      createdAt: { lt: cutoff },
      ...pointId ? { pointId } : {}
    },
    include: { user: true }
  });
  for (const order of staleOrders) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: _default.OrderStatus.CALCULATION_FAILED,
        errorMessage: "Calculation timed out"
      }
    });
    try {
      await notifyCalculationFailed(order.user, {
        fileName: order.fileName,
        errorMessage: "Calculation timed out"
      });
    } catch (error) {
      console.error("[calculation] timeout notify failed:", order.id, error);
    }
  }
}

export { expireStaleCalculations as e, getPricePerPageKopeks as g };
//# sourceMappingURL=calculation.mjs.map
