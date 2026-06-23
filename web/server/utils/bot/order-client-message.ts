import type { Order, User } from '@prisma/client'
import { editMaxStatusMessage, sendMaxStatusMessage } from '../max/client'
import {
  editTelegramStatusMessage,
  sendTelegramStatusMessage,
} from '../telegram/client'
import type {
  MessengerAdapter,
  MessengerPlatform,
  MessengerReplyTarget,
  SentMessage,
  StatusMessageOptions,
} from './types'

export async function saveOrderClientMessage(
  orderId: string,
  sent: SentMessage,
): Promise<void> {
  const { prisma } = await import('../prisma')
  await prisma.order.update({
    where: { id: orderId },
    data: {
      clientMessageId: sent.messageId,
      clientMessageChatId: sent.chatId,
    },
  })
}

function resolveClientMessage(order: Pick<Order, 'clientMessageId' | 'clientMessageChatId'>): SentMessage | null {
  if (!order.clientMessageId || !order.clientMessageChatId) {
    return null
  }
  return {
    messageId: order.clientMessageId,
    chatId: order.clientMessageChatId,
  }
}

function resolvePlatformForOrder(
  user: Pick<User, 'telegramId' | 'maxUserId'>,
  order: Pick<Order, 'clientMessageChatId'>,
): MessengerPlatform | null {
  if (order.clientMessageChatId && user.telegramId
    && order.clientMessageChatId === String(user.telegramId)) {
    return 'telegram'
  }
  if (order.clientMessageChatId && user.maxUserId
    && order.clientMessageChatId === String(user.maxUserId)) {
    return 'max'
  }
  if (user.telegramId) {
    return 'telegram'
  }
  if (user.maxUserId) {
    return 'max'
  }
  return null
}

export async function editOrderClientMessage(
  user: Pick<User, 'telegramId' | 'maxUserId'>,
  order: Pick<Order, 'clientMessageId' | 'clientMessageChatId'>,
  text: string,
  options?: StatusMessageOptions,
): Promise<boolean> {
  const message = resolveClientMessage(order)
  if (!message) {
    return false
  }

  const platform = resolvePlatformForOrder(user, order)
  if (platform === 'telegram') {
    await editTelegramStatusMessage(Number(message.chatId), message, text, options)
    return true
  }
  if (platform === 'max') {
    await editMaxStatusMessage(message, text, options)
    return true
  }
  return false
}

export async function sendOrderClientMessageViaAdapter(
  adapter: MessengerAdapter,
  target: MessengerReplyTarget,
  text: string,
  options?: StatusMessageOptions,
): Promise<SentMessage | null> {
  if (!adapter.sendStatus) {
    return null
  }
  return adapter.sendStatus(target, text, options)
}

export async function editOrderClientMessageViaAdapter(
  adapter: MessengerAdapter,
  target: MessengerReplyTarget,
  order: Pick<Order, 'clientMessageId' | 'clientMessageChatId'>,
  text: string,
  options?: StatusMessageOptions,
): Promise<boolean> {
  const message = resolveClientMessage(order)
  if (!message || !adapter.editStatus) {
    return false
  }
  await adapter.editStatus(target, message, text, options)
  return true
}
