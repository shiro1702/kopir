import { d as defineEventHandler, u as useRuntimeConfig } from '../../../nitro/nitro.mjs';
import { a as assertAdminAuth } from '../../../_/admin-auth.mjs';
import { getMaxClient } from '../../../_/client.mjs';
import { g as getBot } from '../../../_/order-staff-actions.mjs';
import { r as resolveWebhookUrl } from '../../../_/webhook-url.mjs';
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
import 'grammy';
import '../../../_/messages.mjs';

const setWebhooks_post = defineEventHandler(async (event) => {
  assertAdminAuth(event);
  const config = useRuntimeConfig(event);
  const results = {
    telegram: { ok: false, skipped: true, reason: "TELEGRAM_BOT_TOKEN not set" },
    max: { ok: false, skipped: true, reason: "MAX_BOT_TOKEN not set" }
  };
  if (config.telegramBotToken) {
    try {
      const webhookUrl = resolveWebhookUrl(event, "/api/telegram/webhook");
      await getBot().api.setWebhook(webhookUrl);
      results.telegram = { ok: true, webhookUrl };
    } catch (error) {
      results.telegram = {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  if (config.maxBotToken) {
    try {
      const webhookUrl = resolveWebhookUrl(event, "/api/max/webhook");
      await getMaxClient().setWebhook(webhookUrl, config.maxWebhookSecret || void 0);
      results.max = {
        ok: true,
        webhookUrl,
        hasSecret: Boolean(config.maxWebhookSecret)
      };
    } catch (error) {
      results.max = {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  return results;
});

export { setWebhooks_post as default };
//# sourceMappingURL=set-webhooks.post.mjs.map
