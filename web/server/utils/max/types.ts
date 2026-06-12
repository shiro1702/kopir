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

export interface MaxMessage {
  sender?: MaxUser
  recipient?: {
    chat_id?: number
    chat_type?: string
  }
  body?: MaxMessageBody
}

export interface MaxUpdate {
  update_type: MaxUpdateType
  timestamp?: number
  message?: MaxMessage
  chat_id?: number
  user?: MaxUser
  payload?: string
}
