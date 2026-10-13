// 假後端的「資料庫」：用 localStorage 當資料表，同一個瀏覽器的所有分頁共用。
// 階段二這些資料會換成 Supabase 的 messages 表與 nickname_reservations 表。
import type { ChatMessage } from '../types'
import { HISTORY_DAYS, HISTORY_LIMIT, RESERVATION_MS, nicknameKey } from '../rules'

const MESSAGES_KEY = 'anonchat.mock.messages'
const RESERVATIONS_KEY = 'anonchat.mock.reservations'
const MAX_STORED = 500

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 儲存失敗（空間不足、無痕模式）就只剩即時傳送，不影響使用
  }
}

// ---- 訊息 ----

function recentMessages(): ChatMessage[] {
  const cutoff = Date.now() - HISTORY_DAYS * 24 * 60 * 60_000
  return readJson<ChatMessage[]>(MESSAGES_KEY, []).filter((m) => Date.parse(m.created_at) >= cutoff)
}

export function saveMessage(message: ChatMessage): void {
  const list = recentMessages()
  if (list.some((m) => m.id === message.id)) return
  list.push(message)
  writeJson(MESSAGES_KEY, list.slice(-MAX_STORED))
}

export function loadMessages(): ChatMessage[] {
  return recentMessages().slice(-HISTORY_LIMIT)
}

// ---- 代號保留 ----
// 對應架構文件的 nickname_reservations 表：代號 → 屬於哪個 client_id、保留到何時。

interface Reservation {
  nickname: string
  client_id: string
  expires_at: number
}

type ReservationMap = Record<string, Reservation>

function liveReservations(): ReservationMap {
  const now = Date.now()
  const all = readJson<ReservationMap>(RESERVATIONS_KEY, {})
  return Object.fromEntries(Object.entries(all).filter(([, r]) => r.expires_at > now))
}

/** 這個代號目前被「別的」client_id 保留著嗎？ */
export function isReservedByOther(nickname: string, clientId: string): boolean {
  const r = liveReservations()[nicknameKey(nickname)]
  return !!r && r.client_id !== clientId
}

/** 登記或延長保留。同一個 client_id 同時只能保留一個代號，換代號時舊的立刻釋放 */
export function reserve(nickname: string, clientId: string): void {
  const all = liveReservations()
  for (const [k, r] of Object.entries(all)) if (r.client_id === clientId) delete all[k]
  all[nicknameKey(nickname)] = {
    nickname,
    client_id: clientId,
    expires_at: Date.now() + RESERVATION_MS,
  }
  writeJson(RESERVATIONS_KEY, all)
}
