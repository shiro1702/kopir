import { PrismaClient } from '@prisma/client';

var _a;
const globalForPrisma = globalThis;
const prisma = (_a = globalForPrisma.prisma) != null ? _a : new PrismaClient({
  log: ["error"]
});

export { prisma as p };
//# sourceMappingURL=prisma.mjs.map
