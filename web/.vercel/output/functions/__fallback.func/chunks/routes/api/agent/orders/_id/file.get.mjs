import { d as defineEventHandler, a as getRouterParam, c as createError, s as setHeader } from '../../../../../nitro/nitro.mjs';
import { p as prisma, _ as _default } from '../../../../../_/prisma.mjs';
import { a as assertAgentAuth } from '../../../../../_/agent-auth.mjs';
import { a as downloadOrderFile } from '../../../../../_/blob.mjs';
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
import '@vercel/blob';

const DOWNLOADABLE_STATUSES = /* @__PURE__ */ new Set([
  _default.OrderStatus.CALCULATING,
  _default.OrderStatus.PAID,
  _default.OrderStatus.PRINTING
]);
const file_get = defineEventHandler(async (event) => {
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
  if (!DOWNLOADABLE_STATUSES.has(order.status)) {
    throw createError({
      statusCode: 400,
      data: { error: "Order is not available for download", code: "INVALID_STATUS" }
    });
  }
  const buffer = await downloadOrderFile(order.filePath);
  const contentType = order.mimeType || "application/octet-stream";
  setHeader(event, "Content-Type", contentType);
  setHeader(event, "Content-Disposition", `attachment; filename="${order.fileName}"`);
  return buffer;
});

export { file_get as default };
//# sourceMappingURL=file.get.mjs.map
