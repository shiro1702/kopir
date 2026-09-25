import { downloadOrderFile } from '../blob'
import { getActiveCollectingBatch } from '../batch'
import { prisma } from '../prisma'
import { formatPointLabel } from '../points'
import { addPreparedFileToCollectingBatch, upsertBotUser } from './core'
import {
  templateListKeyboard,
  templatesEntryKeyboard,
} from './keyboards'
import * as messages from './messages'
import { resolveAutoBindPointId } from './point-selection'
import type {
  BotUser,
  MessengerAdapter,
  MessengerPlatform,
  MessengerReplyTarget,
} from './types'

export async function listActiveTemplates(pointId: string) {
  return prisma.pointTemplate.findMany({
    where: { pointId, isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      title: true,
      fileName: true,
      filePath: true,
      pageCount: true,
      pointId: true,
    },
  })
}

export async function pointHasActiveTemplates(pointId: string): Promise<boolean> {
  const count = await prisma.pointTemplate.count({
    where: { pointId, isActive: true },
  })
  return count > 0
}

async function resolveCatalogPointId(dbUserId: string): Promise<string | null> {
  const batch = await getActiveCollectingBatch(dbUserId)
  if (batch?.pointId) {
    return batch.pointId
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: dbUserId },
    select: { preferredPointSlug: true, lastPointId: true },
  })
  if (!dbUser) {
    return null
  }

  return resolveAutoBindPointId(
    dbUserId,
    dbUser.preferredPointSlug,
    dbUser.lastPointId,
  )
}

export async function handleTemplateList(
  platform: MessengerPlatform,
  target: MessengerReplyTarget,
  user: BotUser,
  adapter: MessengerAdapter,
): Promise<string> {
  const dbUser = await upsertBotUser(platform, user)
  const pointId = await resolveCatalogPointId(dbUser.id)
  if (!pointId) {
    await adapter.sendText(target, messages.MSG_TEMPLATES_NEED_POINT, { clientMenu: true })
    return messages.MSG_TEMPLATES_NEED_POINT
  }

  const point = await prisma.point.findUnique({
    where: { id: pointId },
    select: { name: true, displayCode: true },
  })
  if (!point) {
    await adapter.sendText(target, messages.MSG_TEMPLATES_NEED_POINT, { clientMenu: true })
    return messages.MSG_TEMPLATES_NEED_POINT
  }

  const templates = await listActiveTemplates(pointId)
  if (templates.length === 0) {
    await adapter.sendText(target, messages.MSG_TEMPLATES_EMPTY, { clientMenu: true })
    return messages.MSG_TEMPLATES_EMPTY
  }

  const pointLabel = formatPointLabel(point)
  const lines = [
    messages.MSG_TEMPLATES_HEADER(pointLabel),
    '',
    ...templates.map((template, index) =>
      messages.formatTemplateListItem(index + 1, template.title, template.pageCount),
    ),
  ]

  await adapter.sendText(target, lines.join('\n'), {
    inlineKeyboard: templateListKeyboard(templates),
  })
  return 'Готовые бланки'
}

export async function handleTemplateSelect(
  platform: MessengerPlatform,
  target: MessengerReplyTarget,
  user: BotUser,
  templateId: string,
  adapter: MessengerAdapter,
): Promise<string> {
  const dbUser = await upsertBotUser(platform, user)
  const template = await prisma.pointTemplate.findFirst({
    where: { id: templateId, isActive: true },
  })
  if (!template) {
    await adapter.sendText(target, messages.MSG_TEMPLATES_NOT_FOUND, { clientMenu: true })
    return messages.MSG_TEMPLATES_NOT_FOUND
  }

  const batch = await getActiveCollectingBatch(dbUser.id)
  if (batch?.pointId && batch.pointId !== template.pointId) {
    await adapter.sendText(target, messages.MSG_TEMPLATES_POINT_MISMATCH, { clientMenu: true })
    return messages.MSG_TEMPLATES_POINT_MISMATCH
  }

  const catalogPointId = await resolveCatalogPointId(dbUser.id)
  if (catalogPointId && catalogPointId !== template.pointId && !batch?.pointId) {
    await adapter.sendText(target, messages.MSG_TEMPLATES_POINT_MISMATCH, { clientMenu: true })
    return messages.MSG_TEMPLATES_POINT_MISMATCH
  }

  let buffer: Buffer
  try {
    buffer = await downloadOrderFile(template.filePath)
  } catch (error) {
    console.error('[bot] template download failed:', template.id, error)
    await adapter.sendText(target, messages.MSG_UPLOAD_FAILED, { clientMenu: true })
    return messages.MSG_UPLOAD_FAILED
  }

  const displayName = template.fileName?.trim() || `${template.title}.pdf`

  await addPreparedFileToCollectingBatch({
    platform,
    target,
    user,
    adapter,
    dbUserId: dbUser.id,
    pointId: template.pointId,
    fileName: displayName,
    mimeType: 'application/pdf',
    pageCount: template.pageCount,
    copies: 1,
    isWord: false,
    buffer,
    kind: 'pdf',
  })

  return 'Бланк добавлен'
}

export async function handleTemplateBack(
  target: MessengerReplyTarget,
  adapter: MessengerAdapter,
): Promise<string> {
  await adapter.sendText(target, messages.MSG_START, { clientMenu: true })
  return 'Назад'
}

/** After point select without an active batch — offer templates if the point has any. */
export async function maybeOfferTemplatesAfterPointSelect(
  target: MessengerReplyTarget,
  pointId: string,
  adapter: MessengerAdapter,
): Promise<void> {
  if (!(await pointHasActiveTemplates(pointId))) {
    return
  }
  await adapter.sendText(
    target,
    'На этой точке есть готовые бланки — можно напечатать без загрузки файла.',
    { inlineKeyboard: templatesEntryKeyboard() },
  )
}
