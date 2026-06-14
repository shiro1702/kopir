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
      var _a2, _b, _c, _d, _e, _f, _g, _h;
      return {
        id: order.id,
        shortId: order.id.slice(-6),
        fileName: order.fileName,
        pageCount: order.pageCount,
        amountKopeks: order.amountKopeks,
        paymentConfirmedAt: (_b = (_a2 = order.paymentConfirmedAt) == null ? void 0 : _a2.toISOString()) != null ? _b : null,
        status: order.status,
        createdAt: order.createdAt.toISOString(),
        paidAt: (_d = (_c = order.paidAt) == null ? void 0 : _c.toISOString()) != null ? _d : null,
        user: {
          messenger: order.user.telegramId ? "telegram" : "max",
          telegramId: (_f = (_e = order.user.telegramId) == null ? void 0 : _e.toString()) != null ? _f : null,
          maxUserId: (_h = (_g = order.user.maxUserId) == null ? void 0 : _g.toString()) != null ? _h : null,
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
