import { d as defineEventHandler, a as getRouterParam, c as createError } from '../../../../../nitro/nitro.mjs';
import { a as assertAdminAuth } from '../../../../../_/admin-auth.mjs';
import { c as confirmOrderPayment } from '../../../../../_/order-staff-actions.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import '@prisma/client';
import '../../../../../_/blob.mjs';
import '@vercel/blob';
import '../../../../../_/prisma.mjs';
import 'grammy';
import '../../../../../_/messages.mjs';
import '../../../../../_/client.mjs';

const confirmPayment_post = defineEventHandler(async (event) => {
  assertAdminAuth(event);
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({
      statusCode: 400,
      data: { error: "Order id is required", code: "MISSING_ORDER_ID" }
    });
  }
  return confirmOrderPayment(id);
});

export { confirmPayment_post as default };
//# sourceMappingURL=confirm-payment.post.mjs.map
