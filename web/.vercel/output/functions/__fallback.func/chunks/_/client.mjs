import { u as useRuntimeConfig } from '../nitro/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, key + "" , value);
const MAX_API_BASE = "https://platform-api.max.ru";
const MAX_UPDATE_TYPES = [
  "message_created",
  "bot_started"
];
function getMaxBotToken() {
  const config = useRuntimeConfig();
  const token = config.maxBotToken;
  if (!token) {
    throw new Error("MAX_BOT_TOKEN is not configured");
  }
  return token;
}
class MaxClient {
  constructor(token) {
    __publicField(this, "token", token);
  }
  async request(method, path, options) {
    const url = new URL(`${MAX_API_BASE}${path}`);
    if (options == null ? void 0 : options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        url.searchParams.set(key, value);
      }
    }
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: this.token,
        ...(options == null ? void 0 : options.body) ? { "Content-Type": "application/json" } : {}
      },
      body: (options == null ? void 0 : options.body) ? JSON.stringify(options.body) : void 0
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`MAX API ${method} ${path} failed: ${response.status} ${body}`);
    }
    if (response.status === 204) {
      return void 0;
    }
    return response.json();
  }
  async setWebhook(url, secret) {
    const body = {
      url,
      update_types: [...MAX_UPDATE_TYPES]
    };
    if (secret) {
      body.secret = secret;
    }
    await this.request("POST", "/subscriptions", { body });
  }
  async sendMessage(target, text) {
    const query = {};
    if (target.chatId !== void 0) {
      query.chat_id = String(target.chatId);
    } else if (target.userId !== void 0) {
      query.user_id = String(target.userId);
    } else {
      throw new Error("MAX sendMessage requires chatId or userId");
    }
    await this.request("POST", "/messages", {
      query,
      body: { text }
    });
  }
  async downloadFile(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download MAX file: ${response.status}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }
}
let maxClientInstance = null;
function getMaxClient() {
  if (!maxClientInstance) {
    maxClientInstance = new MaxClient(getMaxBotToken());
  }
  return maxClientInstance;
}

export { MaxClient, getMaxBotToken, getMaxClient };
//# sourceMappingURL=client.mjs.map
