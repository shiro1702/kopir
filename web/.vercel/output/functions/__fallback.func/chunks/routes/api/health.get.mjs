import { d as defineEventHandler, u as useRuntimeConfig } from '../../nitro/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';

const health_get = defineEventHandler(() => {
  const config = useRuntimeConfig();
  return {
    ok: true,
    version: config.public.appVersion
  };
});

export { health_get as default };
//# sourceMappingURL=health.get.mjs.map
