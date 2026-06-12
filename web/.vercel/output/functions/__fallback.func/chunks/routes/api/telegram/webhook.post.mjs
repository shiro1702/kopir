import { d as defineEventHandler, c as createError } from '../../../nitro/nitro.mjs';
import { webhookCallback } from 'grammy';
import { g as getBot } from '../../../_/bot.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import '@prisma/client';
import '../../../_/blob.mjs';
import '@vercel/blob';
import '../../../_/prisma.mjs';
import '../../../_/points.mjs';

let handler = null;
function getWebhookHandler() {
  if (!handler) {
    handler = webhookCallback(getBot(), "std/http");
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
