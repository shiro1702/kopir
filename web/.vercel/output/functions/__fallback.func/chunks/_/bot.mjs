import { u as useRuntimeConfig } from '../nitro/nitro.mjs';
import { Bot } from 'grammy';
import { OrderStatus } from '@prisma/client';
import { u as uploadOrderPdf } from './blob.mjs';
import { p as prisma } from './prisma.mjs';
import { r as resolvePointBySlug } from './points.mjs';

const DEFAULT_POINT_SLUG = "point_dev_1";
const userPointPreference = /* @__PURE__ */ new Map();
function getBotToken() {
  const config = useRuntimeConfig();
  const token = config.telegramBotToken;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }
  return token;
}
let botInstance = null;
function getBot() {
  if (!botInstance) {
    botInstance = createBot();
  }
  return botInstance;
}
function createBot() {
  const bot = new Bot(getBotToken());
  bot.command("start", async (ctx) => {
    var _a;
    const pointSlug = ((_a = ctx.match) == null ? void 0 : _a.trim()) || DEFAULT_POINT_SLUG;
    userPointPreference.set(ctx.from.id, pointSlug);
    try {
      await resolvePointBySlug(pointSlug);
    } catch {
      userPointPreference.set(ctx.from.id, DEFAULT_POINT_SLUG);
    }
    await ctx.reply(
      "\u041F\u0440\u0438\u0432\u0435\u0442! \u041E\u0442\u043F\u0440\u0430\u0432\u044C PDF-\u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442 \u0434\u043B\u044F \u043F\u0435\u0447\u0430\u0442\u0438.\n\n\u041F\u043E\u0441\u043B\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0444\u0430\u0439\u043B\u0430 \u043C\u044B \u0441\u043E\u043E\u0431\u0449\u0438\u043C \u043D\u043E\u043C\u0435\u0440 \u0437\u0430\u043A\u0430\u0437\u0430 \u0438 \u0438\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u044E \u043F\u043E \u043E\u043F\u043B\u0430\u0442\u0435."
    );
  });
  bot.on("message:document", async (ctx) => {
    var _a, _b, _c, _d, _e, _f, _g;
    const document = ctx.message.document;
    const fileName = (_a = document.file_name) != null ? _a : "document.pdf";
    const mimeType = (_b = document.mime_type) != null ? _b : "";
    const isPdf = mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      await ctx.reply("\u041F\u043E\u043A\u0430 \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u043C \u0442\u043E\u043B\u044C\u043A\u043E PDF. \u041E\u0442\u043F\u0440\u0430\u0432\u044C\u0442\u0435 \u0444\u0430\u0439\u043B \u0441 \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u0435\u043C .pdf");
      return;
    }
    const telegramUser = ctx.from;
    const pointSlug = (_c = userPointPreference.get(telegramUser.id)) != null ? _c : DEFAULT_POINT_SLUG;
    const point = await resolvePointBySlug(pointSlug);
    const user = await prisma.user.upsert({
      where: { telegramId: BigInt(telegramUser.id) },
      update: {
        username: (_d = telegramUser.username) != null ? _d : null,
        firstName: (_e = telegramUser.first_name) != null ? _e : null
      },
      create: {
        telegramId: BigInt(telegramUser.id),
        username: (_f = telegramUser.username) != null ? _f : null,
        firstName: (_g = telegramUser.first_name) != null ? _g : null
      }
    });
    const order = await prisma.order.create({
      data: {
        status: OrderStatus.AWAITING_PAYMENT,
        fileName,
        filePath: "",
        userId: user.id,
        pointId: point.id
      }
    });
    const file = await ctx.getFile();
    const fileUrl = `https://api.telegram.org/file/bot${getBotToken()}/${file.file_path}`;
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file from Telegram: ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const blob = await uploadOrderPdf(order.id, buffer);
    await prisma.order.update({
      where: { id: order.id },
      data: { filePath: blob.url }
    });
    const shortId = order.id.slice(-6);
    await ctx.reply(
      `\u{1F4C4} \u0424\u0430\u0439\u043B \u043F\u043E\u043B\u0443\u0447\u0435\u043D: ${fileName}
\u0417\u0430\u043A\u0430\u0437 #${shortId}
\u0421\u0442\u0430\u0442\u0443\u0441: \u043E\u0436\u0438\u0434\u0430\u0435\u0442 \u043E\u043F\u043B\u0430\u0442\u044B

\u041F\u0435\u0440\u0435\u0432\u0435\u0434\u0438\u0442\u0435 \u0441\u0443\u043C\u043C\u0443 \u043D\u0430 \u043A\u0430\u0440\u0442\u0443 \u0438 \u0434\u043E\u0436\u0434\u0438\u0442\u0435\u0441\u044C \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0430.
\u0412 \u0442\u0435\u0441\u0442\u043E\u0432\u043E\u043C \u0440\u0435\u0436\u0438\u043C\u0435 \u043E\u043F\u043B\u0430\u0442\u0430 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u0435\u0442\u0441\u044F \u0432\u0440\u0443\u0447\u043D\u0443\u044E.`
    );
  });
  bot.catch((err) => {
    console.error("[telegram] bot error:", err);
  });
  return bot;
}
async function notifyPaymentConfirmed(telegramId, orderId) {
  const bot = getBot();
  const shortId = orderId.slice(-6);
  await bot.api.sendMessage(
    Number(telegramId),
    `\u2705 \u041E\u043F\u043B\u0430\u0442\u0430 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0430!
\u0417\u0430\u043A\u0430\u0437 #${shortId}
\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D \u043D\u0430 \u043F\u0435\u0447\u0430\u0442\u044C.`
  );
}

export { getBot as g, notifyPaymentConfirmed as n };
//# sourceMappingURL=bot.mjs.map
