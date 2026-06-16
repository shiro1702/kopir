import { c as createError, u as useRuntimeConfig } from '../nitro/nitro.mjs';
import { p as prisma, _ as _default } from './prisma.mjs';
import { b as detectDocumentKind, m as mimeTypeForKind, u as uploadOrderFile } from './blob.mjs';
import { Bot, InlineKeyboard } from 'grammy';
import { b as getStaffTelegramChatId, i as isTerminalPaymentMode, c as isStaffChannelConfigured, f as formatStaffOrderAwaitingPayment, a as getStaffMaxUserId, d as formatCalculationFailed, e as formatQuote, h as formatPrintComplete, j as formatPaymentReceivedByStaff, k as formatPrintStarted, M as MSG_START, l as MSG_UNSUPPORTED_FILE, m as formatCalculating, n as formatOrderReceived } from './messages.mjs';
import { getMaxClient } from './client.mjs';

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

async function handleStaffCallbackPayload(data) {
  if (data.startsWith("staff_pay:")) {
    const orderId = data.slice("staff_pay:".length);
    await confirmOrderPayment(orderId);
    return "\u041E\u043F\u043B\u0430\u0442\u0430 \u043E\u0442\u043C\u0435\u0447\u0435\u043D\u0430";
  }
  if (data.startsWith("staff_print:")) {
    const orderId = data.slice("staff_print:".length);
    await startOrderPrint(orderId);
    return "\u041F\u0435\u0447\u0430\u0442\u044C \u0437\u0430\u043F\u0443\u0449\u0435\u043D\u0430";
  }
  throw createError({
    statusCode: 400,
    data: { error: "Unknown staff action", code: "UNKNOWN_ACTION" }
  });
}

function getTelegramBotToken() {
  const config = useRuntimeConfig();
  const token = config.telegramBotToken;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }
  return token;
}
async function sendTelegramText(chatId, text) {
  const token = getTelegramBotToken();
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text })
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram sendMessage failed: ${response.status} ${body}`);
  }
}
async function downloadTelegramFile(filePath) {
  const token = getTelegramBotToken();
  const fileUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(`Failed to download file from Telegram: ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

const client = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  downloadTelegramFile: downloadTelegramFile,
  getTelegramBotToken: getTelegramBotToken,
  sendTelegramText: sendTelegramText
}, Symbol.toStringTag, { value: 'Module' }));

function createTelegramAdapter() {
  return {
    platform: "telegram",
    async sendText(target, text) {
      const bot = getBot();
      await bot.api.sendMessage(Number(target.chatId), text);
    }
  };
}
let botInstance = null;
function getBot() {
  if (!botInstance) {
    botInstance = createBot();
  }
  return botInstance;
}
async function handleStaffCallback(data, chatId) {
  const staffChatId = getStaffTelegramChatId();
  if (!staffChatId || chatId !== staffChatId) {
    throw new Error("\u041D\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u0430");
  }
  return handleStaffCallbackPayload(data);
}
function createBot() {
  const bot = new Bot(getTelegramBotToken());
  const adapter = createTelegramAdapter();
  bot.command("start", async (ctx) => {
    var _a;
    const telegramUser = ctx.from;
    const target = {
      platform: "telegram",
      chatId: String(telegramUser.id)
    };
    await handleStart("telegram", target, (_a = ctx.match) == null ? void 0 : _a.trim(), adapter);
  });
  bot.on("message:document", async (ctx) => {
    var _a, _b, _c, _d;
    const document = ctx.message.document;
    const telegramUser = ctx.from;
    const target = {
      platform: "telegram",
      chatId: String(telegramUser.id)
    };
    const file = await ctx.getFile();
    await handleDocument(
      "telegram",
      target,
      {
        externalId: String(telegramUser.id),
        username: (_a = telegramUser.username) != null ? _a : null,
        firstName: (_b = telegramUser.first_name) != null ? _b : null
      },
      {
        fileName: (_c = document.file_name) != null ? _c : "document.pdf",
        mimeType: (_d = document.mime_type) != null ? _d : "",
        download: () => {
          var _a2;
          return downloadTelegramFile((_a2 = file.file_path) != null ? _a2 : "");
        }
      },
      adapter
    );
  });
  bot.on("callback_query:data", async (ctx) => {
    var _a;
    const chatId = (_a = ctx.callbackQuery.message) == null ? void 0 : _a.chat.id;
    if (!chatId) {
      await ctx.answerCallbackQuery({ text: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F", show_alert: true });
      return;
    }
    try {
      const message = await handleStaffCallback(ctx.callbackQuery.data, chatId);
      await ctx.answerCallbackQuery({ text: message });
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
      await ctx.answerCallbackQuery({ text, show_alert: true });
    }
  });
  bot.catch((err) => {
    console.error("[telegram] bot error:", err);
  });
  return bot;
}

function telegramStaffKeyboard(order) {
  const keyboard = new InlineKeyboard();
  if (!order.paymentConfirmedAt) {
    keyboard.text("\u2705 \u041E\u043F\u043B\u0430\u0442\u0430 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0430", `staff_pay:${order.id}`);
  }
  keyboard.text("\u{1F5A8} \u041F\u0435\u0447\u0430\u0442\u044C", `staff_print:${order.id}`);
  return keyboard;
}
function maxStaffKeyboard(order) {
  const buttons = [];
  if (!order.paymentConfirmedAt) {
    buttons.push([{
      type: "callback",
      text: "\u2705 \u041E\u043F\u043B\u0430\u0442\u0430 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0430",
      payload: `staff_pay:${order.id}`,
      intent: "default"
    }]);
  }
  buttons.push([{
    type: "callback",
    text: "\u{1F5A8} \u041F\u0435\u0447\u0430\u0442\u044C",
    payload: `staff_print:${order.id}`,
    intent: "default"
  }]);
  return {
    type: "inline_keyboard",
    payload: { buttons }
  };
}
async function notifyStaffTelegram(order, text) {
  const chatId = getStaffTelegramChatId();
  if (!chatId) {
    return;
  }
  const bot = getBot();
  await bot.api.sendMessage(chatId, text, {
    reply_markup: telegramStaffKeyboard(order)
  });
}
async function notifyStaffMax(order, text) {
  const userId = getStaffMaxUserId();
  if (!userId) {
    return;
  }
  const client = getMaxClient();
  await client.sendMessage({ userId }, text, [maxStaffKeyboard(order)]);
}
async function notifyStaffAll(order, text) {
  const errors = [];
  try {
    await notifyStaffTelegram(order, text);
  } catch (error) {
    errors.push(error instanceof Error ? error : new Error(String(error)));
  }
  try {
    await notifyStaffMax(order, text);
  } catch (error) {
    errors.push(error instanceof Error ? error : new Error(String(error)));
  }
  if (errors.length > 0) {
    console.error("[staff] notify failed:", errors);
    throw errors[0];
  }
}
async function notifyStaffOrderAwaitingPayment(order) {
  if (!isTerminalPaymentMode()) {
    return;
  }
  if (!isStaffChannelConfigured()) {
    console.warn(
      "[staff] STAFF_TELEGRAM_CHAT_ID / STAFF_MAX_USER_ID are not set \u2014 skipping staff notification"
    );
    return;
  }
  const text = formatStaffOrderAwaitingPayment(order);
  await notifyStaffAll(order, text);
}
async function notifyStaffPaymentConfirmed(order) {
  if (!isTerminalPaymentMode() || !isStaffChannelConfigured()) {
    return;
  }
  const shortId = order.id.slice(-6);
  const text = `\u2705 \u041E\u043F\u043B\u0430\u0442\u0430 \u043F\u043E \u0437\u0430\u043A\u0430\u0437\u0443 #${shortId} \u043E\u0442\u043C\u0435\u0447\u0435\u043D\u0430.
\u041C\u043E\u0436\u043D\u043E \u043D\u0430\u0436\u0430\u0442\u044C \xAB\u041F\u0435\u0447\u0430\u0442\u044C\xBB.`;
  await notifyStaffAll(order, text);
}

const DEFAULT_POINT_SLUG = "point_dev_1";

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
      const { sendTelegramText } = await Promise.resolve().then(function () { return client; });
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
      status: isWord ? _default.OrderStatus.CALCULATING : _default.OrderStatus.AWAITING_PAYMENT,
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
  await notifyStaffAfterOrderReady(order.id);
}
async function notifyStaffAfterOrderReady(orderId) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, point: true }
    });
    if ((order == null ? void 0 : order.status) === _default.OrderStatus.AWAITING_PAYMENT) {
      await notifyStaffOrderAwaitingPayment(order);
    }
  } catch (error) {
    console.error("[staff] order notify failed:", orderId, error);
  }
}
async function notifyPaymentReceivedByStaff(user, orderId) {
  await sendToUser(user, formatPaymentReceivedByStaff(orderId.slice(-6)));
}
async function notifyPrintStarted(user, orderId) {
  await sendToUser(user, formatPrintStarted(orderId.slice(-6)));
}
async function notifyQuoteReady(user, order) {
  await sendToUser(
    user,
    formatQuote(order.fileName, order.pageCount, order.amountKopeks)
  );
  await notifyStaffAfterOrderReady(order.id);
}
async function notifyCalculationFailed(user, order) {
  await sendToUser(user, formatCalculationFailed(order.fileName, order.errorMessage));
}
async function notifyPrintComplete(user, orderId) {
  await sendToUser(user, formatPrintComplete(orderId.slice(-6)));
}

function invalidStatus(message) {
  return createError({
    statusCode: 400,
    data: { error: message, code: "INVALID_STATUS" }
  });
}
async function confirmOrderPayment(orderId) {
  if (!isTerminalPaymentMode()) {
    throw createError({
      statusCode: 400,
      data: {
        error: "Payment confirmation is only used in terminal payment mode",
        code: "INVALID_PAYMENT_MODE"
      }
    });
  }
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true }
  });
  if (!order) {
    throw createError({
      statusCode: 404,
      data: { error: "Order not found", code: "ORDER_NOT_FOUND" }
    });
  }
  if (order.status !== _default.OrderStatus.AWAITING_PAYMENT) {
    throw invalidStatus("Order is not awaiting payment");
  }
  if (order.paymentConfirmedAt) {
    return {
      id: order.id,
      status: order.status,
      paymentConfirmedAt: order.paymentConfirmedAt.toISOString()
    };
  }
  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { paymentConfirmedAt: /* @__PURE__ */ new Date() }
  });
  try {
    await notifyPaymentReceivedByStaff(order.user, order.id);
    const fullOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, point: true }
    });
    if (fullOrder) {
      await notifyStaffPaymentConfirmed(fullOrder);
    }
  } catch (error) {
    console.error("[staff] payment confirmed notify failed:", orderId, error);
  }
  return {
    id: updated.id,
    status: updated.status,
    paymentConfirmedAt: updated.paymentConfirmedAt.toISOString()
  };
}
async function startOrderPrint(orderId) {
  var _a, _b, _c, _d;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true }
  });
  if (!order) {
    throw createError({
      statusCode: 404,
      data: { error: "Order not found", code: "ORDER_NOT_FOUND" }
    });
  }
  if (order.status === _default.OrderStatus.PAID) {
    return {
      id: order.id,
      status: order.status,
      paidAt: (_b = (_a = order.paidAt) == null ? void 0 : _a.toISOString()) != null ? _b : null
    };
  }
  if (order.status !== _default.OrderStatus.AWAITING_PAYMENT) {
    throw invalidStatus("Order is not awaiting payment");
  }
  if (isTerminalPaymentMode() && !order.paymentConfirmedAt) {
    throw createError({
      statusCode: 400,
      data: {
        error: "Confirm terminal payment before printing",
        code: "PAYMENT_NOT_CONFIRMED"
      }
    });
  }
  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: _default.OrderStatus.PAID,
      paidAt: /* @__PURE__ */ new Date()
    }
  });
  try {
    await notifyPrintStarted(order.user, order.id);
  } catch (error) {
    console.error("[staff] print started notify failed:", orderId, error);
  }
  return {
    id: updated.id,
    status: updated.status,
    paidAt: (_d = (_c = updated.paidAt) == null ? void 0 : _c.toISOString()) != null ? _d : null
  };
}

export { notifyQuoteReady as a, notifyPrintComplete as b, confirmOrderPayment as c, handleStart as d, handleDocument as e, getBot as g, handleStaffCallbackPayload as h, notifyCalculationFailed as n, resolvePointBySlug as r, startOrderPrint as s };
//# sourceMappingURL=order-staff-actions.mjs.map
