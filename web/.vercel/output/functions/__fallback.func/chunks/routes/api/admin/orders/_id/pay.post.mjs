import { d as defineEventHandler, a as getRouterParam, c as createError } from '../../../../../nitro/nitro.mjs';
import { OrderStatus } from '@prisma/client';
import { a as assertAdminAuth } from '../../../../../_/admin-auth.mjs';
import { p as prisma } from '../../../../../_/prisma.mjs';
import { n as notifyPaymentConfirmed } from '../../../../../_/core.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import '../../../../../_/blob.mjs';
import '@vercel/blob';
import '../../../../../_/points.mjs';

const pay_post = defineEventHandler(async (event) => {
  var _a, _b;
  assertAdminAuth(event);
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({
      statusCode: 400,
      data: { error: "Order id is required", code: "MISSING_ORDER_ID" }
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
  if (order.status === OrderStatus.PAID) {
    return { id: order.id, status: order.status, paidAt: (_a = order.paidAt) == null ? void 0 : _a.toISOString() };
  }
  if (order.status !== OrderStatus.AWAITING_PAYMENT) {
    throw createError({
      statusCode: 400,
      data: { error: "Order is not awaiting payment", code: "INVALID_STATUS" }
    });
  }
  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: OrderStatus.PAID,
      paidAt: /* @__PURE__ */ new Date()
    }
  });
  try {
    await notifyPaymentConfirmed(order.user.telegramId, order.id);
  } catch (error) {
    console.error("[admin] telegram notify failed:", error);
  }
  return {
    id: updated.id,
    status: updated.status,
    paidAt: (_b = updated.paidAt) == null ? void 0 : _b.toISOString()
  };
});

export { pay_post as default };
//# sourceMappingURL=pay.post.mjs.map
