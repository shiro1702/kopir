import { d as defineEventHandler } from '../../../nitro/nitro.mjs';
import { a as assertAdminAuth } from '../../../_/admin-auth.mjs';
import { g as getBot } from '../../../_/bot.mjs';
import { r as resolveWebhookUrl } from '../../../_/webhook-url.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'grammy';
import '../../../_/core.mjs';
import '@prisma/client';
import '../../../_/blob.mjs';
import '@vercel/blob';
import '../../../_/prisma.mjs';
import '../../../_/client2.mjs';

const setWebhook_post = defineEventHandler(async (event) => {
  assertAdminAuth(event);
  const bot = getBot();
  const webhookUrl = resolveWebhookUrl(event, "/api/telegram/webhook");
  await bot.api.setWebhook(webhookUrl);
  return { ok: true, webhookUrl };
});

export { setWebhook_post as default };
//# sourceMappingURL=set-webhook.post.mjs.map
