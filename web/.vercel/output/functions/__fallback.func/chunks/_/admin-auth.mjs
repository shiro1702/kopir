import { u as useRuntimeConfig, b as getHeader, c as createError } from '../nitro/nitro.mjs';

function assertAdminAuth(event) {
  const config = useRuntimeConfig(event);
  const authHeader = getHeader(event, "authorization");
  const expected = `Bearer ${config.adminSecret}`;
  if (!config.adminSecret || authHeader !== expected) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
      data: { error: "Invalid admin secret", code: "UNAUTHORIZED" }
    });
  }
}

export { assertAdminAuth as a };
//# sourceMappingURL=admin-auth.mjs.map
