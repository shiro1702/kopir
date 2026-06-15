import { u as useRuntimeConfig, b as getHeader, c as createError } from '../nitro/nitro.mjs';

function assertAgentAuth(event) {
  const config = useRuntimeConfig(event);
  const authHeader = getHeader(event, "authorization");
  const expected = `Bearer ${config.agentApiKey}`;
  if (!config.agentApiKey || authHeader !== expected) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
      data: { error: "Invalid agent API key", code: "UNAUTHORIZED" }
    });
  }
}

export { assertAgentAuth as a };
//# sourceMappingURL=agent-auth.mjs.map
