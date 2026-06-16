import { b as getHeader, c as createError, u as useRuntimeConfig, d as defineEventHandler, r as readBody } from '../../../nitro/nitro.mjs';
import { timingSafeEqual } from 'node:crypto';
import { h as handleStaffCallbackPayload, d as handleStart, e as handleDocument } from '../../../_/order-staff-actions.mjs';
import { b as detectDocumentKind, m as mimeTypeForKind } from '../../../_/blob.mjs';
import { a as getStaffMaxUserId } from '../../../_/messages.mjs';
import { getMaxClient } from '../../../_/client.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
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
import 'grammy';
import '@vercel/blob';

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
      const fileName = (_k = fileAttachment.filename) != null ? _k : "document.pdf";
      const kind = detectDocumentKind(fileName);
      const mimeType = mimeTypeForKind(kind === "unsupported" ? "pdf" : kind, fileName);
      await handleDocument(
        "max",
        target,
        user,
        {
          fileName,
          mimeType,
          download: () => client.downloadFile(fileAttachment.payload.url)
        },
        adapter
      );
      return;
    }
    case "message_callback": {
      const callback = update.callback;
      if (!(callback == null ? void 0 : callback.callback_id) || !callback.payload) {
        return;
      }
      const staffMaxUserId = getStaffMaxUserId();
      if (!staffMaxUserId || callback.user.user_id !== staffMaxUserId) {
        await client.answerCallback(callback.callback_id, "\u041D\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u0430");
        return;
      }
      try {
        const message = await handleStaffCallbackPayload(callback.payload);
        await client.answerCallback(callback.callback_id, message);
      } catch (error) {
        let text = "\u041E\u0448\u0438\u0431\u043A\u0430";
        if (error && typeof error === "object" && "data" in error) {
          const data = error.data;
          if (data == null ? void 0 : data.error) {
            text = data.error;
          }
        } else if (error instanceof Error) {
          text = error.message;
        }
        await client.answerCallback(callback.callback_id, text);
      }
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
