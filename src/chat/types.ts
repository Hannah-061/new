// 前端與後端之間講的話（對應 docs/architecture.md 第 5 節）。
// 兩種後端（假的、Supabase）都必須遵守這份約定。

/** 一則聊天訊息 */
export interface ChatMessage {
  id: string // 由後端產生，每則唯一
  client_msg_id: string // 由瀏覽器送出前產生，用來對上「我剛送出的那則」
  client_id: string // 這個瀏覽器的匿名身分編號
  nickname: string
  content: string
  created_at: string // ISO 時間，以後端為準
}

/** 一位在線者的資訊（Presence） */
export interface PresenceInfo {
  client_id: string
  nickname: string
  joined_at: string
}

/** 進出提示：只存在畫面上，不存進歷史 */
export interface SystemNotice {
  id: string
  kind: 'join' | 'leave'
  nickname: string
  at: string
}

export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected'

/** 本機的訊息狀態：傳送中 → 成功或失敗 */
export type MessageStatus = 'sending' | 'sent' | 'failed'

export type JoinErrorCode =
  | 'NICKNAME_TAKEN' // 有人正在線上用
  | 'NICKNAME_RESERVED' // 剛離開的人還在保留期內
  | 'CONNECTION_FAILED'

export type SendErrorCode = 'RATE_LIMITED' | 'INVALID' | 'SEND_FAILED'

export class ChatError<C extends string = string> extends Error {
  readonly code: C
  constructor(code: C) {
    super(code)
    this.name = 'ChatError'
    this.code = code
  }
}

/** 後端會通知前端的事件 */
export interface ChatEvents {
  'message:new': ChatMessage
  'presence:sync': PresenceInfo[]
  'presence:join': PresenceInfo
  'presence:leave': PresenceInfo
  'connection:status': ConnectionStatus
}
