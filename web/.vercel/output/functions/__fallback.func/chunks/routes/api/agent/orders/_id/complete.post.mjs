import { d as defineEventHandler, a as getRouterParam, c as createError, r as readBody } from '../../../../../nitro/nitro.mjs';
import { p as prisma, _ as _default } from '../../../../../_/prisma.mjs';
import { a as assertAgentAuth } from '../../../../../_/agent-auth.mjs';
import { b as notifyPrintComplete } from '../../../../../_/order-staff-actions.mjs';
import { d as deleteOrderFile } from '../../../../../_/blob.mjs';
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
import 'http';
import 'https';
import 'stream';
import '@grammyjs/types';
import 'abort-controller';
import '../../../../../_/messages.mjs';
import '../../../../../_/client.mjs';
import '@vercel/blob';

const complete_post = defineEventHandler(async (event) => {
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
  if (!(body == null ? void 0 : body.status) || !["PRINTED", "FAILED"].includes(body.status)) {
    throw createError({
      statusCode: 400,
      data: { error: "status must be PRINTED or FAILED", code: "INVALID_STATUS" }
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
  if (order.status === _default.OrderStatus.PRINTED || order.status === _default.OrderStatus.FAILED) {
    return { id: order.id, status: order.status };
  }
  if (order.status !== _default.OrderStatus.PRINTING) {
    throw createError({
      statusCode: 400,
      data: { error: "Order is not in PRINTING status", code: "INVALID_STATUS" }
    });
  }
  const targetStatus = body.status === "PRINTED" ? _default.OrderStatus.PRINTED : _default.OrderStatus.FAILED;
  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: targetStatus,
      printedAt: /* @__PURE__ */ new Date(),
      errorMessage: body.status === "FAILED" ? (_a = body.errorMessage) != null ? _a : "Print failed" : null
    }
  });
  await deleteOrderFile(order.filePath);
  if (targetStatus === _default.OrderStatus.PRINTED) {
    try {
      await notifyPrintComplete(order.user, order.id);
    } catch (error) {
      console.error("[complete] print notify error:", order.id, error);
    }
  }
  return { id: updated.id, status: updated.status };
});

export { complete_post as default };
//# sourceMappingURL=complete.post.mjs.map
