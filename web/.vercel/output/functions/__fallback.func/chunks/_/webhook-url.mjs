import { b as getHeader, c as createError } from '../nitro/nitro.mjs';

function resolveWebhookUrl(event, path) {
  var _a;
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}${path}`;
  }
  const host = getHeader(event, "host");
  const proto = (_a = getHeader(event, "x-forwarded-proto")) != null ? _a : "http";
  if (host) {
    return `${proto}://${host}${path}`;
  }
  throw createError({
    statusCode: 400,
    data: {
      error: "Cannot determine webhook URL. Deploy to Vercel or set VERCEL_URL.",
      code: "MISSING_WEBHOOK_URL"
    }
  });
}

export { resolveWebhookUrl as r };
//# sourceMappingURL=webhook-url.mjs.map
