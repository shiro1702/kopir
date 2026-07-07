import { MSG_POINT_OFFLINE_PAYMENT } from './bot/messages'
import { prisma } from './prisma'

export function getPointOfflineThresholdSec(): number {
  const raw = process.env.POINT_OFFLINE_THRESHOLD_SEC ?? '20'
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 20
}

export function isPointAgentOnline(point: { lastSeenAt: Date | null }): boolean {
  if (!point.lastSeenAt) {
    return false
  }
  const thresholdMs = getPointOfflineThresholdSec() * 1000
  return Date.now() - point.lastSeenAt.getTime() < thresholdMs
}

export function assertPointAgentOnline(point: { lastSeenAt: Date | null }): void {
  if (!isPointAgentOnline(point)) {
    throw createError({
      statusCode: 400,
      data: { error: MSG_POINT_OFFLINE_PAYMENT, code: 'POINT_AGENT_OFFLINE' },
    })
  }
}

export function pointAgentStatusPayload(point: {
  slug: string
  name: string
  lastSeenAt: Date | null
}) {
  return {
    slug: point.slug,
    name: point.name,
    agentOnline: isPointAgentOnline(point),
    lastSeenAt: point.lastSeenAt?.toISOString() ?? null,
  }
}

export async function touchPointAgentSeen(pointId: string): Promise<void> {
  await prisma.point.update({
    where: { id: pointId },
    data: { lastSeenAt: new Date() },
  })
}

export async function resolvePointBySlug(slug: string) {
  const point = await prisma.point.findUnique({ where: { slug } })
  if (!point || !point.isActive) {
    throw createError({
      statusCode: 404,
      data: { error: `Point not found: ${slug}`, code: 'POINT_NOT_FOUND' },
    })
  }
  return point
}

export async function resolvePointByDisplayCode(code: string) {
  const normalized = code.trim()
  const point = await prisma.point.findFirst({
    where: { displayCode: normalized, isActive: true },
  })
  if (!point) {
    throw createError({
      statusCode: 404,
      data: { error: 'Точка не найдена', code: 'POINT_NOT_FOUND' },
    })
  }
  return point
}

export async function listActivePoints() {
  return prisma.point.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      slug: true,
      name: true,
      displayCode: true,
      pricePerPageKopeks: true,
      isActive: true,
      lastSeenAt: true,
    },
  })
}

export async function countActivePoints(): Promise<number> {
  return prisma.point.count({ where: { isActive: true } })
}

export function formatPointLabel(point: { name: string, displayCode?: string | null }): string {
  if (point.displayCode) {
    return `${point.name} (код ${point.displayCode})`
  }
  return point.name
}
