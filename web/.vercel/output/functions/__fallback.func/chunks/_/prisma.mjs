import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;
function createPrismaClient() {
  return new PrismaClient({
    log: ["error"]
  });
}
function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}
const prisma = new Proxy({}, {
  get(_target, property, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, property, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  }
});

export { prisma as p };
//# sourceMappingURL=prisma.mjs.map
