import { d as defineEventHandler, u as useRuntimeConfig } from '../../../nitro/nitro.mjs';
import { a as assertAdminAuth } from '../../../_/admin-auth.mjs';
import { g as getPaymentMode, p as paymentModeLabel } from '../../../_/messages.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';

const config_get = defineEventHandler((event) => {
  assertAdminAuth(event);
  const mode = getPaymentMode();
  return {
    paymentMode: mode,
    paymentModeLabel: paymentModeLabel(mode),
    staffTelegramConfigured: Boolean(useRuntimeConfig().staffTelegramChatId),
    staffMaxConfigured: Boolean(useRuntimeConfig().staffMaxUserId)
  };
});

export { config_get as default };
//# sourceMappingURL=config.get.mjs.map
