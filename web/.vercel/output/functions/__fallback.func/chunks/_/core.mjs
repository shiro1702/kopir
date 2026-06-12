import { OrderStatus } from '@prisma/client';
import { u as uploadOrderPdf } from './blob.mjs';
import { p as prisma } from './prisma.mjs';
import { r as resolvePointBySlug } from './points.mjs';

const DEFAULT_POINT_SLUG = "point_dev_1";

const MSG_START = "\u041F\u0440\u0438\u0432\u0435\u0442! \u041E\u0442\u043F\u0440\u0430\u0432\u044C PDF-\u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442 \u0434\u043B\u044F \u043F\u0435\u0447\u0430\u0442\u0438.\n\n\u041F\u043E\u0441\u043B\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0444\u0430\u0439\u043B\u0430 \u043C\u044B \u0441\u043E\u043E\u0431\u0449\u0438\u043C \u043D\u043E\u043C\u0435\u0440 \u0437\u0430\u043A\u0430\u0437\u0430 \u0438 \u0438\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u044E \u043F\u043E \u043E\u043F\u043B\u0430\u0442\u0435.";
const MSG_PDF_ONLY = "\u041F\u043E\u043A\u0430 \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u043C \u0442\u043E\u043B\u044C\u043A\u043E PDF. \u041E\u0442\u043F\u0440\u0430\u0432\u044C\u0442\u0435 \u0444\u0430\u0439\u043B \u0441 \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u0435\u043C .pdf";
function formatOrderReceived(fileName, shortId) {
  return `\u{1F4C4} \u0424\u0430\u0439\u043B \u043F\u043E\u043B\u0443\u0447\u0435\u043D: ${fileName}
\u0417\u0430\u043A\u0430\u0437 #${shortId}
\u0421\u0442\u0430\u0442\u0443\u0441: \u043E\u0436\u0438\u0434\u0430\u0435\u0442 \u043E\u043F\u043B\u0430\u0442\u044B

\u041F\u0435\u0440\u0435\u0432\u0435\u0434\u0438\u0442\u0435 \u0441\u0443\u043C\u043C\u0443 \u043D\u0430 \u043A\u0430\u0440\u0442\u0443 \u0438 \u0434\u043E\u0436\u0434\u0438\u0442\u0435\u0441\u044C \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0430.
\u0412 \u0442\u0435\u0441\u0442\u043E\u0432\u043E\u043C \u0440\u0435\u0436\u0438\u043C\u0435 \u043E\u043F\u043B\u0430\u0442\u0430 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u0435\u0442\u0441\u044F \u0432\u0440\u0443\u0447\u043D\u0443\u044E.`;
}
function formatPaymentConfirmed(shortId) {
  return `\u2705 \u041E\u043F\u043B\u0430\u0442\u0430 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0430!
\u0417\u0430\u043A\u0430\u0437 #${shortId}
\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D \u043D\u0430 \u043F\u0435\u0447\u0430\u0442\u044C.`;
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
async function handlePdfDocument(platform, target, user, pdf, adapter) {
  var _a, _b;
  const fileName = pdf.fileName;
  const mimeType = (_a = pdf.mimeType) != null ? _a : "";
  const isPdf = mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    await adapter.sendText(target, MSG_PDF_ONLY);
    return;
  }
  const pointSlug = (_b = getPointPreference(platform, target.chatId)) != null ? _b : DEFAULT_POINT_SLUG;
  const point = await resolvePointBySlug(pointSlug);
  const dbUser = await upsertBotUser(platform, user);
  const order = await prisma.order.create({
    data: {
      status: OrderStatus.AWAITING_PAYMENT,
      fileName,
      filePath: "",
      userId: dbUser.id,
      pointId: point.id
    }
  });
  const buffer = await pdf.download();
  const blob = await uploadOrderPdf(order.id, buffer);
  await prisma.order.update({
    where: { id: order.id },
    data: { filePath: blob.url }
  });
  const shortId = order.id.slice(-6);
  await adapter.sendText(target, formatOrderReceived(fileName, shortId));
}
async function notifyPaymentConfirmed(user, orderId) {
  const text = formatPaymentConfirmed(orderId.slice(-6));
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
    console.error("[bot] payment notification failed:", errors);
    throw errors[0];
  }
}

export { handlePdfDocument as a, handleStart as h, notifyPaymentConfirmed as n };
//# sourceMappingURL=core.mjs.map
