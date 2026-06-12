import { b as getHeader, c as createError, u as useRuntimeConfig, d as defineEventHandler, r as readBody } from '../../../nitro/nitro.mjs';
import { timingSafeEqual } from 'node:crypto';
import { h as handleStart, a as handlePdfDocument } from '../../../_/core.mjs';
import { getMaxClient } from '../../../_/client.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import '@prisma/client';
import '../../../_/blob.mjs';
import '@vercel/blob';
import '../../../_/prisma.mjs';
import '../../../_/points.mjs';

function createMaxAdapter() {
  const client = getMaxClient();
  return {
    platform: "max",
    async sendText(target, text) {
      await client.sendMessage({ chatId: Number(target.chatId) }, text);
    }
  };
}
function verifyMaxWebhookSecret(header) {
  const config = useRuntimeConfig();
  const secret = config.maxWebhookSecret;
  if (!secret) {
    return true;
  }
  if (!header || header.length !== secret.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(header), Buffer.from(secret));
}
function parseStartPayload(text) {
  if (!text) {
    return void 0;
  }
  const trimmed = text.trim();
  if (!trimmed.startsWith("/start")) {
    return void 0;
  }
  const parts = trimmed.split(/\s+/);
  return parts[1];
}
function findFileAttachment(attachments) {
  return attachments == null ? void 0 : attachments.find((attachment) => attachment.type === "file");
}
async function handleMaxUpdate(update) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
  const adapter = createMaxAdapter();
  const client = getMaxClient();
  switch (update.update_type) {
    case "bot_started": {
      if (!update.chat_id) {
        return;
      }
      const target = {
        platform: "max",
        chatId: String(update.chat_id)
      };
      await handleStart("max", target, update.payload, adapter);
      return;
    }
    case "message_created": {
      const message = update.message;
      if (!((_a = message == null ? void 0 : message.recipient) == null ? void 0 : _a.chat_id) || !((_b = message.sender) == null ? void 0 : _b.user_id)) {
        return;
      }
      const chatId = message.recipient.chat_id;
      const sender = message.sender;
      const target = {
        platform: "max",
        chatId: String(chatId)
      };
      const user = {
        externalId: String(sender.user_id),
        username: (_c = sender.username) != null ? _c : null,
        firstName: (_e = (_d = sender.first_name) != null ? _d : sender.name) != null ? _e : null
      };
      const startPayload = parseStartPayload((_f = message.body) == null ? void 0 : _f.text);
      if (startPayload !== void 0 || ((_h = (_g = message.body) == null ? void 0 : _g.text) == null ? void 0 : _h.trim()) === "/start") {
        await handleStart("max", target, startPayload, adapter);
        return;
      }
      const fileAttachment = findFileAttachment((_i = message.body) == null ? void 0 : _i.attachments);
      if (!((_j = fileAttachment == null ? void 0 : fileAttachment.payload) == null ? void 0 : _j.url)) {
        return;
      }
      await handlePdfDocument(
        "max",
        target,
        user,
        {
          fileName: (_k = fileAttachment.filename) != null ? _k : "document.pdf",
          download: () => client.downloadFile(fileAttachment.payload.url)
        },
        adapter
      );
      return;
    }
    default:
      return;
  }
}
function assertMaxWebhookAuth(event) {
  const secretHeader = getHeader(event, "x-max-bot-api-secret");
  if (!verifyMaxWebhookSecret(secretHeader)) {
    throw createError({
      statusCode: 403,
      data: { error: "Invalid MAX webhook secret", code: "FORBIDDEN" }
    });
  }
}

const webhook_post = defineEventHandler(async (event) => {
  assertMaxWebhookAuth(event);
  const update = await readBody(event);
  if (!(update == null ? void 0 : update.update_type)) {
    throw createError({
      statusCode: 400,
      data: { error: "Invalid MAX update payload", code: "INVALID_PAYLOAD" }
    });
  }
  try {
    await handleMaxUpdate(update);
  } catch (error) {
    console.error("[max] webhook handler error:", error);
  }
  return { ok: true };
});

export { webhook_post as default };
//# sourceMappingURL=webhook.post.mjs.map
