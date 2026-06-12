import { d as defineEventHandler, b as getHeader, c as createError } from '../../../nitro/nitro.mjs';
import { a as assertAdminAuth } from '../../../_/admin-auth.mjs';
import { g as getBot } from '../../../_/bot.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'grammy';
import '@prisma/client';
import '../../../_/blob.mjs';
import '@vercel/blob';
import '../../../_/prisma.mjs';
import '../../../_/points.mjs';

function resolveWebhookUrl(event) {
  var _a;
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}/api/telegram/webhook`;
  }
  const host = getHeader(event, "host");
  const proto = (_a = getHeader(event, "x-forwarded-proto")) != null ? _a : "http";
  if (host) {
    return `${proto}://${host}/api/telegram/webhook`;
  }
  throw createError({
    statusCode: 400,
    data: {
      error: "Cannot determine webhook URL. Deploy to Vercel or set VERCEL_URL.",
      code: "MISSING_WEBHOOK_URL"
    }
  });
}
const setWebhook_post = defineEventHandler(async (event) => {
  assertAdminAuth(event);
  const bot = getBot();
  const webhookUrl = resolveWebhookUrl(event);
  await bot.api.setWebhook(webhookUrl);
  return { ok: true, webhookUrl };
});

export { setWebhook_post as default };
//# sourceMappingURL=set-webhook.post.mjs.map
