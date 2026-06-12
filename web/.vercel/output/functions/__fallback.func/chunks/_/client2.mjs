import { u as useRuntimeConfig } from '../nitro/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';

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

export { downloadTelegramFile, getTelegramBotToken, sendTelegramText };
//# sourceMappingURL=client2.mjs.map
