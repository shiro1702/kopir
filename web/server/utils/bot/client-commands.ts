import {
  countActiveBatchOrders,
  getActiveBatchOrders,
  getActiveCollectingBatch,
  getBatchKeyboardMode,
  getBatchMaxFiles,
} from '../batch'
import { prisma } from '../prisma'
import { formatPointLabel } from '../points'
import { upsertBotUser } from './core'
import * as messages from './messages'
import type { InlineKeyboardButton } from './types'
import type {
  BotUser,
  MessengerAdapter,
  MessengerPlatform,
  MessengerReplyTarget,
} from './types'

export const CLIENT_COMMAND_DEFINITIONS = [
  { command: 'print', description: 'Начать печать' },
  { command: 'files', description: 'Мои файлы' },
  { command: 'point', description: 'Выбрать точку' },
  { command: 'help', description: 'Помощь' },
] as const

export type ClientCommandName = typeof CLIENT_COMMAND_DEFINITIONS[number]['command']

export const BTN_CMD_PRINT = '📄 Печать'
export const BTN_CMD_FILES = '📁 Мои файлы'
export const BTN_CMD_POINT = '📍 Точка'
export const BTN_CMD_HELP = '❓ Помощь'

export const CLIENT_CMD_CALLBACK_PREFIX = 'client_cmd:'

export function clientCommandCallback(name: ClientCommandName): string {
  return `${CLIENT_CMD_CALLBACK_PREFIX}${name}`
}

export function parseClientCommandCallback(payload: string): ClientCommandName | null {
  if (!payload.startsWith(CLIENT_CMD_CALLBACK_PREFIX)) {
    return null
  }
  const name = payload.slice(CLIENT_CMD_CALLBACK_PREFIX.length)
  if (name === 'print' || name === 'files' || name === 'point' || name === 'help') {
    return name
  }
  return null
}

export function isClientCommandCallback(payload: string): boolean {
  return payload.startsWith(CLIENT_CMD_CALLBACK_PREFIX)
}

export function clientMenuInlineKeyboard(): InlineKeyboardButton[][] {
  return [
    [
      { text: BTN_CMD_PRINT, callbackData: clientCommandCallback('print') },
      { text: BTN_CMD_FILES, callbackData: clientCommandCallback('files') },
    ],
    [
      { text: BTN_CMD_POINT, callbackData: clientCommandCallback('point') },
      { text: BTN_CMD_HELP, callbackData: clientCommandCallback('help') },
    ],
  ]
}

export function formatClientCommandList(): string {
  return [
    'Доступные команды:',
    '/print - начать печать',
    '/files - мои файлы',
    '/point - выбрать точку',
    '/help - помощь',
  ].join('\n')
}

export function parseClientCommandText(text: string): ClientCommandName | null {
  const trimmed = text.trim()
  const slashMatch = trimmed.match(/^\/(print|files|point|help|my_files)(?:@\S+)?$/i)
  if (slashMatch) {
    const cmd = slashMatch[1]!.toLowerCase()
    return cmd === 'my_files' ? 'files' : cmd as ClientCommandName
  }

  if (trimmed === BTN_CMD_PRINT) {
    return 'print'
  }
  if (trimmed === BTN_CMD_FILES) {
    return 'files'
  }
  if (trimmed === BTN_CMD_POINT) {
    return 'point'
  }
  if (trimmed === BTN_CMD_HELP) {
    return 'help'
  }

  return null
}

async function formatActiveFilesMessage(userId: string): Promise<string> {
  const batch = await getActiveCollectingBatch(userId)
  if (!batch) {
    return 'Нет файлов в очереди. Отправьте документ для начала.'
  }

  const orders = await getActiveBatchOrders(batch.id)
  if (orders.length === 0) {
    return 'Нет файлов в очереди. Отправьте документ для начала.'
  }

  const batchWithPoint = await prisma.orderBatch.findUnique({
    where: { id: batch.id },
    include: { point: { select: { name: true, displayCode: true } } },
  })

  const maxFiles = getBatchMaxFiles()
  const keyboardMode = await getBatchKeyboardMode(batch.id)
  const filesList = orders.map((order, index) => {
    const pages = order.pageCount > 0 ? ` — ${order.pageCount} стр.` : ''
    const status = order.status === 'CALCULATING' ? ' (считаем…)' : ''
    return `${index + 1}. ${order.fileName}${pages}${status}`
  }).join('\n')

  const lines = [
    `📁 Файлов: ${orders.length} из ${maxFiles}`,
    '',
    filesList,
  ]

  if (batchWithPoint?.point) {
    lines.push('', `📍 Точка: ${formatPointLabel(batchWithPoint.point)}`)
  } else {
    lines.push('', '⚠️ Точка не выбрана — нажмите «Точка» или отправьте код точки.')
  }

  if (batchWithPoint && batchWithPoint.totalAmountKopeks > 0) {
    lines.push(`💰 Стоимость: ${Math.round(batchWithPoint.totalAmountKopeks / 100)} ₽`)
  }

  if (keyboardMode === 'ready') {
    lines.push('', 'Нажмите «Оплатить», когда будете готовы.')
  } else if (keyboardMode === 'calculating') {
    lines.push('', 'Подождите: идёт подсчёт страниц.')
  } else if (keyboardMode === 'needs_point') {
    lines.push('', 'Выберите точку, чтобы рассчитать стоимость.')
  }

  return lines.join('\n')
}

export async function handleClientCommand(
  command: ClientCommandName,
  platform: MessengerPlatform,
  target: MessengerReplyTarget,
  user: BotUser,
  adapter: MessengerAdapter,
): Promise<void> {
  switch (command) {
    case 'print':
      await adapter.sendText(target, messages.MSG_START, { clientMenu: true })
      return
    case 'help':
      await adapter.sendText(target, messages.MSG_HELP, { clientMenu: true })
      return
    case 'point': {
      const { handlePointChangeMenu } = await import('./point-selection')
      await handlePointChangeMenu(target, adapter)
      return
    }
    case 'files': {
      const dbUser = await upsertBotUser(platform, user)
      const text = await formatActiveFilesMessage(dbUser.id)
      const batch = await getActiveCollectingBatch(dbUser.id)
      const options: { clientMenu?: boolean, batchKeyboard?: import('./types').BatchKeyboardMode } = {
        clientMenu: true,
      }
      if (batch) {
        const count = await countActiveBatchOrders(batch.id)
        if (count > 0) {
          options.batchKeyboard = await getBatchKeyboardMode(batch.id)
          options.clientMenu = platform === 'max'
        }
      }
      await adapter.sendText(target, text, options)
      return
    }
  }
}

export async function handleUnknownClientText(
  target: MessengerReplyTarget,
  adapter: MessengerAdapter,
): Promise<void> {
  await adapter.sendText(
    target,
    `Не понял сообщение.\n\n${formatClientCommandList()}`,
    { clientMenu: true },
  )
}
