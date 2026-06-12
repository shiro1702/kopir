import { d as defineEventHandler, u as useRuntimeConfig } from '../../../nitro/nitro.mjs';
import { a as assertAdminAuth } from '../../../_/admin-auth.mjs';
import { getMaxClient } from '../../../_/client.mjs';
import { r as resolveWebhookUrl } from '../../../_/webhook-url.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';

const setWebhook_post = defineEventHandler(async (event) => {
  assertAdminAuth(event);
  const config = useRuntimeConfig(event);
  const client = getMaxClient();
  const webhookUrl = resolveWebhookUrl(event, "/api/max/webhook");
  await client.setWebhook(webhookUrl, config.maxWebhookSecret || void 0);
  return {
    ok: true,
    webhookUrl,
    hasSecret: Boolean(config.maxWebhookSecret)
  };
});

export { setWebhook_post as default };
//# sourceMappingURL=set-webhook.post.mjs.map
