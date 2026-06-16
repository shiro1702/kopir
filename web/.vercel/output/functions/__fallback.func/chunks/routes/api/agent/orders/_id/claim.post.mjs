import { d as defineEventHandler, a as getRouterParam, c as createError } from '../../../../../nitro/nitro.mjs';
import { p as prisma, _ as _default } from '../../../../../_/prisma.mjs';
import { a as assertAgentAuth } from '../../../../../_/agent-auth.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:os';
import '../../../../../virtual/_commonjsHelpers.mjs';
import 'node:tty';
import 'node:child_process';
import 'node:fs/promises';
import 'node:util';
import 'node:process';
import 'node:async_hooks';
import 'path';
import 'fs';

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
  if (order.status === _default.OrderStatus.PRINTING) {
    return { id: order.id, status: order.status };
  }
  if (order.status !== _default.OrderStatus.PAID) {
    throw createError({
      statusCode: 400,
      data: { error: "Order cannot be claimed", code: "INVALID_STATUS" }
    });
  }
  const updated = await prisma.order.update({
    where: { id },
    data: { status: _default.OrderStatus.PRINTING }
  });
  return { id: updated.id, status: updated.status };
});

export { claim_post as default };
//# sourceMappingURL=claim.post.mjs.map
