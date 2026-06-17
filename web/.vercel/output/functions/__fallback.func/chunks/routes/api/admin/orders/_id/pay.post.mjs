import { d as defineEventHandler, a as getRouterParam, c as createError } from '../../../../../nitro/nitro.mjs';
import { a as assertAdminAuth } from '../../../../../_/admin-auth.mjs';
import { s as startOrderPrint } from '../../../../../_/order-staff-actions.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import '../../../../../_/prisma.mjs';
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
import '../../../../../_/blob.mjs';
import '@vercel/blob';
import 'http';
import 'https';
import 'stream';
import '@grammyjs/types';
import 'abort-controller';
import '../../../../../_/messages.mjs';
import '../../../../../_/client.mjs';

const pay_post = defineEventHandler(async (event) => {
  assertAdminAuth(event);
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({
      statusCode: 400,
      data: { error: "Order id is required", code: "MISSING_ORDER_ID" }
    });
  }
  return startOrderPrint(id);
});

export { pay_post as default };
//# sourceMappingURL=pay.post.mjs.map
