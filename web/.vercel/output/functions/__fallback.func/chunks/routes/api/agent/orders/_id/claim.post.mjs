import { d as defineEventHandler, a as getRouterParam, c as createError } from '../../../../../nitro/nitro.mjs';
import { OrderStatus } from '@prisma/client';
import { a as assertAgentAuth } from '../../../../../_/agent-auth.mjs';
import { p as prisma } from '../../../../../_/prisma.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';

const claim_post = defineEventHandler(async (event) => {
  assertAgentAuth(event);
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({
      statusCode: 400,
      data: { error: "Order id is required", code: "MISSING_ORDER_ID" }
    });
  }
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    throw createError({
      statusCode: 404,
      data: { error: "Order not found", code: "ORDER_NOT_FOUND" }
    });
  }
  if (order.status === OrderStatus.PRINTING) {
    return { id: order.id, status: order.status };
  }
  if (order.status !== OrderStatus.PAID) {
    throw createError({
      statusCode: 400,
      data: { error: "Order cannot be claimed", code: "INVALID_STATUS" }
    });
  }
  const updated = await prisma.order.update({
    where: { id },
    data: { status: OrderStatus.PRINTING }
  });
  return { id: updated.id, status: updated.status };
});

export { claim_post as default };
//# sourceMappingURL=claim.post.mjs.map
