import { d as defineEventHandler } from '../../../nitro/nitro.mjs';
import { a as assertAdminAuth } from '../../../_/admin-auth.mjs';
import { g as getBot } from '../../../_/order-staff-actions.mjs';
import { r as resolveWebhookUrl } from '../../../_/webhook-url.mjs';
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

const setWebhook_post = defineEventHandler(async (event) => {
  assertAdminAuth(event);
  const bot = getBot();
  const webhookUrl = resolveWebhookUrl(event, "/api/telegram/webhook");
  await bot.api.setWebhook(webhookUrl);
  return { ok: true, webhookUrl };
});

export { setWebhook_post as default };
//# sourceMappingURL=set-webhook.post.mjs.map
