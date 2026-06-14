import { OrderStatus } from '@prisma/client';
import { b as detectDocumentKind, m as mimeTypeForKind, u as uploadOrderFile } from './blob.mjs';
import { p as prisma } from './prisma.mjs';
import { c as createError } from '../nitro/nitro.mjs';

async function resolvePointBySlug(slug) {
  const point = await prisma.point.findUnique({ where: { slug } });
  if (!point || !point.isActive) {
    throw createError({
      statusCode: 404,
      data: { error: `Point not found: ${slug}`, code: "POINT_NOT_FOUND" }
    });
  }
  return point;
}

const DEFAULT_POINT_SLUG = "point_dev_1";

const MSG_START = "\u041F\u0440\u0438\u0432\u0435\u0442! \u041E\u0442\u043F\u0440\u0430\u0432\u044C PDF \u0438\u043B\u0438 Word-\u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442 (.doc, .docx) \u0434\u043B\u044F \u043F\u0435\u0447\u0430\u0442\u0438.\n\n\u041F\u043E\u0441\u043B\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0444\u0430\u0439\u043B\u0430 \u043C\u044B \u0441\u043E\u043E\u0431\u0449\u0438\u043C \u043D\u043E\u043C\u0435\u0440 \u0437\u0430\u043A\u0430\u0437\u0430 \u0438 \u0438\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u044E \u043F\u043E \u043E\u043F\u043B\u0430\u0442\u0435.";
const MSG_UNSUPPORTED_FILE = "\u041F\u043E\u043A\u0430 \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u043C \u0442\u043E\u043B\u044C\u043A\u043E PDF \u0438 Word (.doc, .docx). \u041E\u0442\u043F\u0440\u0430\u0432\u044C\u0442\u0435 \u0444\u0430\u0439\u043B \u0432 \u043E\u0434\u043D\u043E\u043C \u0438\u0437 \u044D\u0442\u0438\u0445 \u0444\u043E\u0440\u043C\u0430\u0442\u043E\u0432.";
const MSG_CALCULATING = "\u0421\u0447\u0438\u0442\u0430\u0435\u043C \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B \u043D\u0430 \u043F\u0440\u0438\u043D\u0442\u0435\u0440\u0435\u2026 \u042D\u0442\u043E \u043C\u043E\u0436\u0435\u0442 \u0437\u0430\u043D\u044F\u0442\u044C \u0434\u043E 20 \u0441\u0435\u043A\u0443\u043D\u0434.";
const MSG_CALCULATION_FAILED = "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u0442\u044C \u0444\u0430\u0439\u043B. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435, \u0447\u0442\u043E \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442 \u043D\u0435 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0451\u043D, \u0438 \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0441\u043D\u043E\u0432\u0430 \u0438\u043B\u0438 \u043E\u0442\u043F\u0440\u0430\u0432\u044C\u0442\u0435 PDF.";
function formatOrderReceived(fileName, shortId) {
  return `\u{1F4C4} \u0424\u0430\u0439\u043B \u043F\u043E\u043B\u0443\u0447\u0435\u043D: ${fileName}
\u0417\u0430\u043A\u0430\u0437 #${shortId}
\u0421\u0442\u0430\u0442\u0443\u0441: \u043E\u0436\u0438\u0434\u0430\u0435\u0442 \u043E\u043F\u043B\u0430\u0442\u044B

\u041F\u0435\u0440\u0435\u0432\u0435\u0434\u0438\u0442\u0435 \u0441\u0443\u043C\u043C\u0443 \u043D\u0430 \u043A\u0430\u0440\u0442\u0443 \u0438 \u0434\u043E\u0436\u0434\u0438\u0442\u0435\u0441\u044C \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0430.
\u0412 \u0442\u0435\u0441\u0442\u043E\u0432\u043E\u043C \u0440\u0435\u0436\u0438\u043C\u0435 \u043E\u043F\u043B\u0430\u0442\u0430 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u0435\u0442\u0441\u044F \u0432\u0440\u0443\u0447\u043D\u0443\u044E.`;
}
function formatCalculating(fileName, shortId) {
  return `\u{1F4C4} \u0424\u0430\u0439\u043B \u043F\u043E\u043B\u0443\u0447\u0435\u043D: ${fileName}
\u0417\u0430\u043A\u0430\u0437 #${shortId}

` + MSG_CALCULATING;
}
function formatQuote(fileName, pageCount, amountKopeks) {
  const amountRub = Math.round(amountKopeks / 100);
  return `\u{1F4C4} ${fileName}
\u0421\u0442\u0440\u0430\u043D\u0438\u0446: ${pageCount}
\u0421\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C: ${amountRub} \u20BD

\u041E\u0436\u0438\u0434\u0430\u0435\u043C \u043E\u043F\u043B\u0430\u0442\u0443. \u041F\u043E\u0441\u043B\u0435 \u043F\u0435\u0440\u0435\u0432\u043E\u0434\u0430 \u0441\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442 \u0437\u0430\u043A\u0430\u0437.`;
}
function formatCalculationFailed(fileName, errorMessage) {
  const detail = errorMessage == null ? void 0 : errorMessage.trim();
  if (detail) {
    return `${MSG_CALCULATION_FAILED}

\u041F\u0440\u0438\u0447\u0438\u043D\u0430: ${detail}`;
  }
  return MSG_CALCULATION_FAILED;
}
function formatPaymentConfirmed(shortId) {
  return `\u2705 \u041E\u043F\u043B\u0430\u0442\u0430 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0430!
\u0417\u0430\u043A\u0430\u0437 #${shortId}
\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D \u043D\u0430 \u043F\u0435\u0447\u0430\u0442\u044C.`;
}
function formatPrintComplete(shortId) {
  return `\u2705 \u0413\u043E\u0442\u043E\u0432\u043E!
\u0417\u0430\u043A\u0430\u0437 #${shortId}
\u0417\u0430\u0431\u0435\u0440\u0438\u0442\u0435 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442 \u0443 \u043F\u0440\u0438\u043D\u0442\u0435\u0440\u0430.`;
}

const userPointPreference = /* @__PURE__ */ new Map();
function preferenceKey(platform, chatId) {
  return `${platform}:${chatId}`;
}
function setPointPreference(platform, chatId, slug) {
  userPointPreference.set(preferenceKey(platform, chatId), slug);
}
function getPointPreference(platform, chatId) {
  return userPointPreference.get(preferenceKey(platform, chatId));
}

async function upsertBotUser(platform, user) {
  var _a, _b;
  const messengerUserId = BigInt(user.externalId);
  const profile = {
    username: (_a = user.username) != null ? _a : null,
    firstName: (_b = user.firstName) != null ? _b : null
  };
  if (platform === "telegram") {
    return prisma.user.upsert({
      where: { telegramId: messengerUserId },
      update: profile,
      create: { telegramId: messengerUserId, ...profile }
    });
  }
  return prisma.user.upsert({
    where: { maxUserId: messengerUserId },
    update: profile,
    create: { maxUserId: messengerUserId, ...profile }
  });
}
async function sendToUser(user, text) {
  const errors = [];
  if (user.telegramId) {
    try {
      const { sendTelegramText } = await import('./client2.mjs');
      await sendTelegramText(Number(user.telegramId), text);
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }
  }
  if (user.maxUserId) {
    try {
      const { getMaxClient } = await import('./client.mjs');
      await getMaxClient().sendMessage({ userId: Number(user.maxUserId) }, text);
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }
  }
  if (errors.length > 0) {
    console.error("[bot] notification failed:", errors);
    throw errors[0];
  }
}
async function handleStart(platform, target, pointSlug, adapter) {
  const slug = (pointSlug == null ? void 0 : pointSlug.trim()) || DEFAULT_POINT_SLUG;
  try {
    await resolvePointBySlug(slug);
    setPointPreference(platform, target.chatId, slug);
  } catch {
    setPointPreference(platform, target.chatId, DEFAULT_POINT_SLUG);
  }
  await adapter.sendText(target, MSG_START);
}
async function handleDocument(platform, target, user, document, adapter) {
  var _a;
  const fileName = document.fileName;
  const kind = detectDocumentKind(fileName, document.mimeType);
  if (kind === "unsupported") {
    await adapter.sendText(target, MSG_UNSUPPORTED_FILE);
    return;
  }
  const pointSlug = (_a = getPointPreference(platform, target.chatId)) != null ? _a : DEFAULT_POINT_SLUG;
  const point = await resolvePointBySlug(pointSlug);
  const dbUser = await upsertBotUser(platform, user);
  const mimeType = document.mimeType || mimeTypeForKind(kind, fileName);
  const isWord = kind === "word";
  const order = await prisma.order.create({
    data: {
      status: isWord ? OrderStatus.CALCULATING : OrderStatus.AWAITING_PAYMENT,
      fileName,
      filePath: "",
      mimeType,
      userId: dbUser.id,
      pointId: point.id
    }
  });
  const buffer = await document.download();
  const blob = await uploadOrderFile(order.id, buffer, {
    fileName,
    mimeType,
    kind
  });
  await prisma.order.update({
    where: { id: order.id },
    data: { filePath: blob.url }
  });
  const shortId = order.id.slice(-6);
  if (isWord) {
    await adapter.sendText(target, formatCalculating(fileName, shortId));
    return;
  }
  await adapter.sendText(target, formatOrderReceived(fileName, shortId));
}
async function notifyPaymentConfirmed(user, orderId) {
  await sendToUser(user, formatPaymentConfirmed(orderId.slice(-6)));
}
async function notifyQuoteReady(user, order) {
  await sendToUser(
    user,
    formatQuote(order.fileName, order.pageCount, order.amountKopeks)
  );
}
async function notifyCalculationFailed(user, order) {
  await sendToUser(user, formatCalculationFailed(order.fileName, order.errorMessage));
}
async function notifyPrintComplete(user, orderId) {
  await sendToUser(user, formatPrintComplete(orderId.slice(-6)));
}

export { notifyCalculationFailed as a, notifyQuoteReady as b, notifyPrintComplete as c, handleDocument as d, handleStart as h, notifyPaymentConfirmed as n, resolvePointBySlug as r };
//# sourceMappingURL=core.mjs.map
