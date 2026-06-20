export type MaxUpdateType =
  | 'message_created'
  | 'message_callback'
  | 'bot_started'
  | 'bot_added'
  | 'bot_removed'
  | 'bot_stopped'
  | string

export interface MaxUser {
  user_id: number
  name?: string
  username?: string
  first_name?: string
}

export interface MaxCallback {
  timestamp?: number
  callback_id: string
  payload?: string
  user: MaxUser
}

export interface MaxInlineKeyboardButton {
  type: 'callback'
  text: string
  payload: string
  intent?: 'default'
}

export interface MaxInlineKeyboardAttachment {
  type: 'inline_keyboard'
  payload: {
    buttons: MaxInlineKeyboardButton[][]
  }
}

export interface MaxAttachment {
  type: string
  filename?: string
  payload?: {
    url?: string
    token?: string
  }
}

export interface MaxMessageBody {
  mid?: string
  text?: string
  attachments?: MaxAttachment[]
}

export interface MaxLinkedMessage {
  type?: string
  sender?: MaxUser
  chat_id?: number
  message?: MaxMessageBody
}

export interface MaxMessage {
  sender?: MaxUser
  recipient?: {
    chat_id?: number
    chat_type?: string
  }
  link?: MaxLinkedMessage | null
  body?: MaxMessageBody | null
}

export interface MaxUpdate {
  update_type: MaxUpdateType
  timestamp?: number
  message?: MaxMessage
  chat_id?: number
  user?: MaxUser
  callback?: MaxCallback
  payload?: string
}
