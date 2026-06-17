import { d as defineEventHandler, c as createError } from '../../../nitro/nitro.mjs';
import { m as mod, g as getBot } from '../../../_/order-staff-actions.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import '../../../_/prisma.mjs';
import 'node:os';
import '../../../virtual/_commonjsHelpers.mjs';
import 'node:tty';
import 'node:child_process';
import 'node:fs/promises';
import 'node:util';
import 'node:process';
import 'node:async_hooks';
import 'path';
import 'fs';
import '../../../_/blob.mjs';
import '@vercel/blob';
import 'http';
import 'https';
import 'stream';
import '@grammyjs/types';
import 'abort-controller';
import '../../../_/messages.mjs';
import '../../../_/client.mjs';

let handler = null;
function getWebhookHandler() {
  if (!handler) {
    handler = mod.webhookCallback(getBot(), "std/http");
  }
  return handler;
}
const webhook_post = defineEventHandler(async (event) => {
  try {
    const handleUpdate = getWebhookHandler();
    return await handleUpdate(event.node.req, event.node.res);
  } catch (error) {
    console.error("[telegram] webhook error:", error);
    throw createError({
      statusCode: 500,
      data: { error: "Webhook handler failed", code: "WEBHOOK_ERROR" }
    });
  }
});

export { webhook_post as default };
//# sourceMappingURL=webhook.post.mjs.map
