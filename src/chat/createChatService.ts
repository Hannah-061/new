import type { ChatService } from './ChatService'
import { getClientId } from './identity'
import { MockChatService } from './MockChatService'

let instance: ChatService | null = null

/**
 * 決定用哪一種後端。畫面只會從這裡拿到 ChatService。
 *
 * 階段一：一律是假後端。
 * 階段二：在這裡判斷有沒有 VITE_SUPABASE_URL 與 VITE_SUPABASE_PUBLISHABLE_KEY，
 *         有就回傳 new SupabaseChatService(...)，沒有就維持假後端。
 */
export function createChatService(): ChatService {
  if (!instance) instance = new MockChatService(getClientId())
  return instance
}
