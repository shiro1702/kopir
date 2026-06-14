import { Bot } from 'grammy';
import { h as handleStart, d as handleDocument } from './core.mjs';
import { getTelegramBotToken, downloadTelegramFile } from './client2.mjs';

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
        download: () => downloadTelegramFile(file.file_path)
      },
      adapter
    );
  });
  bot.catch((err) => {
    console.error("[telegram] bot error:", err);
  });
  return bot;
}

export { getBot as g };
//# sourceMappingURL=bot.mjs.map
