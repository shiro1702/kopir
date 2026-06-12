import { d as defineEventHandler, g as getQuery } from '../../../nitro/nitro.mjs';
import { a as assertAdminAuth } from '../../../_/admin-auth.mjs';
import { p as prisma } from '../../../_/prisma.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import '@prisma/client';

const orders_get = defineEventHandler(async (event) => {
  var _a;
  assertAdminAuth(event);
  const query = getQuery(event);
  const status = (_a = query.status) != null ? _a : "AWAITING_PAYMENT";
  const orders = await prisma.order.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
    include: {
      user: true,
      point: true
    }
  });
  return {
    orders: orders.map((order) => {
      var _a2, _b;
      return {
        id: order.id,
        shortId: order.id.slice(-6),
        fileName: order.fileName,
        status: order.status,
        createdAt: order.createdAt.toISOString(),
        paidAt: (_b = (_a2 = order.paidAt) == null ? void 0 : _a2.toISOString()) != null ? _b : null,
        user: {
          telegramId: order.user.telegramId.toString(),
          username: order.user.username,
          firstName: order.user.firstName
        },
        point: {
          slug: order.point.slug,
          name: order.point.name
        }
      };
    })
  };
});

export { orders_get as default };
//# sourceMappingURL=orders.get.mjs.map
