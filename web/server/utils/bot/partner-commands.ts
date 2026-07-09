import { getPartnerByMessenger } from '../partner-auth'
import * as partnerMessages from './partner-messages'
import type { InlineKeyboardButton } from './types'
import type {
  BotUser,
  MessengerAdapter,
  MessengerPlatform,
  MessengerReplyTarget,
} from './types'

export const PARTNER_COMMAND_DEFINITIONS = [
  { command: 'partner', description: 'Кабинет партнера' },
  { command: 'partner_points', description: 'Точки партнера' },
  { command: 'partner_balance', description: 'Баланс партнера' },
  { command: 'partner_requisites', description: 'Реквизиты партнера' },
  { command: 'partner_help', description: 'Помощь партнеру' },
] as const

export type PartnerCommandName = typeof PARTNER_COMMAND_DEFINITIONS[number]['command']

export const BTN_PARTNER_MENU = '📋 Кабинет'
export const BTN_PARTNER_POINTS = '📍 Точки'
export const BTN_PARTNER_BALANCE = '💰 Баланс'
export const BTN_PARTNER_REQUISITES = '🏦 Реквизиты'
export const BTN_PARTNER_HELP = '❓ Помощь'

export const PARTNER_CMD_CALLBACK_PREFIX = 'partner_cmd:'

export function partnerCommandCallback(name: PartnerCommandName): string {
  return `${PARTNER_CMD_CALLBACK_PREFIX}${name}`
}

export function parsePartnerCommandCallback(payload: string): PartnerCommandName | null {
  if (!payload.startsWith(PARTNER_CMD_CALLBACK_PREFIX)) {
    return null
  }
  const name = payload.slice(PARTNER_CMD_CALLBACK_PREFIX.length)
  if (
    name === 'partner'
    || name === 'partner_points'
    || name === 'partner_balance'
    || name === 'partner_requisites'
    || name === 'partner_help'
  ) {
    return name
  }
  return null
}

export function isPartnerCommandCallback(payload: string): boolean {
  return payload.startsWith(PARTNER_CMD_CALLBACK_PREFIX)
}

export function partnerMenuInlineKeyboard(): InlineKeyboardButton[][] {
  return [
    [
      { text: BTN_PARTNER_MENU, callbackData: partnerCommandCallback('partner') },
      { text: BTN_PARTNER_POINTS, callbackData: partnerCommandCallback('partner_points') },
    ],
    [
      { text: BTN_PARTNER_BALANCE, callbackData: partnerCommandCallback('partner_balance') },
      { text: BTN_PARTNER_REQUISITES, callbackData: partnerCommandCallback('partner_requisites') },
    ],
    [
      { text: BTN_PARTNER_HELP, callbackData: partnerCommandCallback('partner_help') },
    ],
  ]
}

export function parsePartnerCommandText(text: string): PartnerCommandName | null {
  const trimmed = text.trim()
  const slashMatch = trimmed.match(
    /^\/(partner|partner_points|partner_balance|partner_requisites|partner_help)(?:@\S+)?$/i,
  )
  if (slashMatch) {
    return slashMatch[1]!.toLowerCase() as PartnerCommandName
  }

  if (trimmed === BTN_PARTNER_MENU) return 'partner'
  if (trimmed === BTN_PARTNER_POINTS) return 'partner_points'
  if (trimmed === BTN_PARTNER_BALANCE) return 'partner_balance'
  if (trimmed === BTN_PARTNER_REQUISITES) return 'partner_requisites'
  if (trimmed === BTN_PARTNER_HELP) return 'partner_help'

  return null
}

export function formatPartnerHelp(): string {
  return [
    '❓ Команды партнера',
    '',
    '/partner - открыть кабинет',
    '/partner_points - список точек',
    '/partner_balance - баланс к выплате',
    '/partner_requisites - текущие реквизиты',
    '/partner_help - эта справка',
    '',
    'Служебные команды:',
    '/partner phone <id_точки> <номер>',
    '/partner req Название | ИНН | Расчетный счет | БИК',
  ].join('\n')
}

export async function handleUnknownPartnerText(
  target: MessengerReplyTarget,
  adapter: MessengerAdapter,
): Promise<void> {
  await adapter.sendText(
    target,
    `Не понял сообщение.\n\n${formatPartnerHelp()}`,
    { partnerMenu: true },
  )
}

async function ensurePartner(platform: MessengerPlatform, user: BotUser) {
  return getPartnerByMessenger(platform, BigInt(user.externalId))
}

export async function handlePartnerQuickCommand(
  command: PartnerCommandName,
  platform: MessengerPlatform,
  target: MessengerReplyTarget,
  user: BotUser,
  adapter: MessengerAdapter,
): Promise<void> {
  const partner = await ensurePartner(platform, user)
  if (!partner) {
    await adapter.sendText(target, partnerMessages.formatPartnerNotBound(), { partnerMenu: true })
    return
  }

  if (command === 'partner_help') {
    await adapter.sendText(target, formatPartnerHelp(), { partnerMenu: true })
    return
  }

  if (command === 'partner' || command === 'partner_points') {
    const { buildPartnerMenuScreen } = await import('../partner-actions')
    const screen = await buildPartnerMenuScreen(platform, BigInt(user.externalId))
    await adapter.sendText(target, screen.text, screen.keyboard.length > 0
      ? { inlineKeyboard: screen.keyboard }
      : { partnerMenu: true })
    return
  }

  if (command === 'partner_balance') {
    const { handlePartnerCallbackPayload } = await import('../partner-actions')
    const screen = await handlePartnerCallbackPayload(platform, BigInt(user.externalId), 'partner_balance')
    await adapter.sendText(target, screen.text, screen.keyboard.length > 0
      ? { inlineKeyboard: screen.keyboard }
      : { partnerMenu: true })
    return
  }

  const { handlePartnerCallbackPayload } = await import('../partner-actions')
  const screen = await handlePartnerCallbackPayload(platform, BigInt(user.externalId), 'partner_requisites')
  await adapter.sendText(target, screen.text, screen.keyboard.length > 0
    ? { inlineKeyboard: screen.keyboard }
    : { partnerMenu: true })
}
