import type { ChatEvents, ChatMessage } from './types'

/**
 * 前端與後端之間的「合約」。
 *
 * 畫面只認得這份合約，完全不知道背後是假後端還是 Supabase。
 * 階段一：MockChatService（在瀏覽器裡模擬）。
 * 階段二：SupabaseChatService（新增一個實作，畫面不用改）。
 *
 * 錯誤一律丟出 ChatError：
 *   join        → NICKNAME_TAKEN / NICKNAME_RESERVED / CONNECTION_FAILED
 *   sendMessage → RATE_LIMITED / INVALID / SEND_FAILED
 */
export interface ChatService {
  /** 讓畫面知道現在是不是示範模式（階段二的真後端回傳 'supabase'） */
  readonly kind: 'mock' | 'supabase'

  join(nickname: string): Promise<void>
  leave(): Promise<void>
  sendMessage(input: { client_msg_id: string; content: string }): Promise<ChatMessage>
  /** 最近 50 則（近 7 天內），由舊到新 */
  loadHistory(): Promise<ChatMessage[]>

  /** 訂閱事件，回傳取消訂閱的函式 */
  on<E extends keyof ChatEvents>(event: E, handler: (payload: ChatEvents[E]) => void): () => void
}

/** 很小的事件發送器，兩種後端實作都可以用 */
export class Emitter {
  private handlers = new Map<string, Set<(payload: never) => void>>()

  on<E extends keyof ChatEvents>(event: E, handler: (payload: ChatEvents[E]) => void): () => void {
    let set = this.handlers.get(event)
    if (!set) {
      set = new Set()
      this.handlers.set(event, set)
    }
    set.add(handler as (payload: never) => void)
    return () => {
      set.delete(handler as (payload: never) => void)
    }
  }

  emit<E extends keyof ChatEvents>(event: E, payload: ChatEvents[E]): void {
    this.handlers.get(event)?.forEach((h) => (h as (p: ChatEvents[E]) => void)(payload))
  }
}
