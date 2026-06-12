import { d as defineEventHandler, a as getRouterParam, c as createError, s as setHeader } from '../../../../../nitro/nitro.mjs';
import { OrderStatus } from '@prisma/client';
import { a as assertAgentAuth } from '../../../../../_/agent-auth.mjs';
import { a as downloadOrderPdf } from '../../../../../_/blob.mjs';
import { p as prisma } from '../../../../../_/prisma.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import '@vercel/blob';

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
  if (order.status !== OrderStatus.PAID && order.status !== OrderStatus.PRINTING) {
    throw createError({
      statusCode: 400,
      data: { error: "Order is not available for download", code: "INVALID_STATUS" }
    });
  }
  const buffer = await downloadOrderPdf(order.filePath);
  setHeader(event, "Content-Type", "application/pdf");
  setHeader(event, "Content-Disposition", `attachment; filename="${order.fileName}"`);
  return buffer;
});

export { file_get as default };
//# sourceMappingURL=file.get.mjs.map
