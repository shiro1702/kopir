import { d as defineEventHandler, g as getQuery, c as createError } from '../../../nitro/nitro.mjs';
import { OrderStatus } from '@prisma/client';
import { a as assertAgentAuth } from '../../../_/agent-auth.mjs';
import { e as expireStaleCalculations } from '../../../_/calculation.mjs';
import { p as prisma } from '../../../_/prisma.mjs';
import { r as resolvePointBySlug } from '../../../_/order-staff-actions.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import '../../../_/blob.mjs';
import '@vercel/blob';
import 'grammy';
import '../../../_/messages.mjs';
import '../../../_/client.mjs';

function parseQueueKind(raw) {
  if (raw === "calculate") {
    return "calculate";
  }
  return "print";
}
const queue_get = defineEventHandler(async (event) => {
  assertAgentAuth(event);
  const query = getQuery(event);
  const pointSlug = query.pointId;
  if (!pointSlug) {
    throw createError({
      statusCode: 400,
      data: { error: "pointId query parameter is required", code: "MISSING_POINT_ID" }
    });
  }
  const kind = parseQueueKind(query.kind);
  const point = await resolvePointBySlug(pointSlug);
  if (kind === "calculate") {
    await expireStaleCalculations(point.id);
    const orders2 = await prisma.order.findMany({
      where: {
        pointId: point.id,
        status: OrderStatus.CALCULATING
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        fileName: true,
        mimeType: true,
        createdAt: true
      }
    });
    return {
      orders: orders2.map((order) => ({
        id: order.id,
        fileName: order.fileName,
        mimeType: order.mimeType,
        downloadUrl: `/api/agent/orders/${order.id}/file`,
        createdAt: order.createdAt.toISOString()
      }))
    };
  }
  const orders = await prisma.order.findMany({
    where: {
      pointId: point.id,
      status: OrderStatus.PAID
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      pageCount: true,
      createdAt: true
    }
  });
  return {
    orders: orders.map((order) => ({
      id: order.id,
      fileName: order.fileName,
      mimeType: order.mimeType,
      downloadUrl: `/api/agent/orders/${order.id}/file`,
      pageCount: order.pageCount,
      createdAt: order.createdAt.toISOString()
    }))
  };
});

export { queue_get as default };
//# sourceMappingURL=queue.get.mjs.map
