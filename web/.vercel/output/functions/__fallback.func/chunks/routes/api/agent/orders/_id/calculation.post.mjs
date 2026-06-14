import { d as defineEventHandler, a as getRouterParam, c as createError, r as readBody } from '../../../../../nitro/nitro.mjs';
import { OrderStatus } from '@prisma/client';
import { a as assertAgentAuth } from '../../../../../_/agent-auth.mjs';
import { a as notifyCalculationFailed, b as notifyQuoteReady } from '../../../../../_/core.mjs';
import { g as getPricePerPageKopeks } from '../../../../../_/calculation.mjs';
import { p as prisma } from '../../../../../_/prisma.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import '../../../../../_/blob.mjs';
import '@vercel/blob';

const calculation_post = defineEventHandler(async (event) => {
  var _a;
  assertAgentAuth(event);
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({
      statusCode: 400,
      data: { error: "Order id is required", code: "MISSING_ORDER_ID" }
    });
  }
  const body = await readBody(event);
  if (!(body == null ? void 0 : body.status) || !["OK", "FAILED"].includes(body.status)) {
    throw createError({
      statusCode: 400,
      data: { error: "status must be OK or FAILED", code: "INVALID_STATUS" }
    });
  }
  const order = await prisma.order.findUnique({
    where: { id },
    include: { user: true }
  });
  if (!order) {
    throw createError({
      statusCode: 404,
      data: { error: "Order not found", code: "ORDER_NOT_FOUND" }
    });
  }
  if (order.status === OrderStatus.AWAITING_PAYMENT && body.status === "OK") {
    throw createError({
      statusCode: 409,
      data: { error: "Order already calculated", code: "ALREADY_CALCULATED" }
    });
  }
  if (order.status !== OrderStatus.CALCULATING) {
    throw createError({
      statusCode: 400,
      data: { error: "Order is not in CALCULATING status", code: "INVALID_STATUS" }
    });
  }
  if (body.status === "FAILED") {
    const updated2 = await prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.CALCULATION_FAILED,
        errorMessage: ((_a = body.errorMessage) == null ? void 0 : _a.trim()) || "Calculation failed"
      }
    });
    try {
      await notifyCalculationFailed(order.user, {
        fileName: order.fileName,
        errorMessage: updated2.errorMessage
      });
    } catch (error) {
      console.error("[calculation] failed notify error:", order.id, error);
    }
    return { id: updated2.id, status: updated2.status };
  }
  const pageCount = body.pageCount;
  if (!pageCount || !Number.isInteger(pageCount) || pageCount < 1) {
    throw createError({
      statusCode: 400,
      data: { error: "pageCount must be a positive integer", code: "INVALID_PAGE_COUNT" }
    });
  }
  const amountKopeks = pageCount * getPricePerPageKopeks();
  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: OrderStatus.AWAITING_PAYMENT,
      pageCount,
      amountKopeks,
      calculatedAt: /* @__PURE__ */ new Date(),
      errorMessage: null
    }
  });
  try {
    await notifyQuoteReady(order.user, updated);
  } catch (error) {
    console.error("[calculation] quote notify error:", order.id, error);
  }
  return {
    id: updated.id,
    status: updated.status,
    pageCount: updated.pageCount,
    amountKopeks: updated.amountKopeks
  };
});

export { calculation_post as default };
//# sourceMappingURL=calculation.post.mjs.map
