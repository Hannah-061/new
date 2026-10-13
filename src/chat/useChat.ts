// 把後端的事件整理成畫面要的資料。
// 共用層：不管背後是假後端還是 Supabase，這裡的行為（30 秒緩衝、訊息狀態、送出間隔）都一樣。
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import type { ChatService } from './ChatService'
import { newId, saveLastNickname } from './identity'
import { RATE_LIMIT_MS, leaveGraceMs, normalizeMessage } from './rules'
import {
  ChatError,
  type ChatMessage,
  type JoinErrorCode,
  type MessageStatus,
  type PresenceInfo,
  type SystemNotice,
} from './types'

export interface DisplayMessage extends ChatMessage {
  status: MessageStatus
}

export type TimelineItem =
  | { kind: 'message'; msg: DisplayMessage }
  | { kind: 'notice'; notice: SystemNotice }

type Phase = 'idle' | 'joining' | 'joined'

interface State {
  phase: Phase
  joinError: JoinErrorCode | null
  nickname: string
  items: TimelineItem[]
  online: PresenceInfo[]
}

type Action =
  | { type: 'JOIN_START'; nickname: string }
  | { type: 'JOIN_OK'; history: ChatMessage[] }
  | { type: 'JOIN_FAIL'; error: JoinErrorCode }
  | { type: 'LEFT' }
  | { type: 'MESSAGE_UPSERT'; message: DisplayMessage }
  | { type: 'MESSAGE_STATUS'; clientMsgId: string; status: MessageStatus }
  | { type: 'PRESENCE_SYNC'; list: PresenceInfo[] }
  | { type: 'PRESENCE_SET'; info: PresenceInfo }
  | { type: 'PRESENCE_REMOVE'; clientId: string }
  | { type: 'NOTICE'; notice: SystemNotice }

const initialState: State = { phase: 'idle', joinError: null, nickname: '', items: [], online: [] }

function isSameMessage(a: ChatMessage, b: ChatMessage): boolean {
  return a.id === b.id || a.client_msg_id === b.client_msg_id
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'JOIN_START':
      return { ...initialState, phase: 'joining', nickname: action.nickname }
    case 'JOIN_OK': {
      const history = action.history.map<TimelineItem>((m) => ({
        kind: 'message',
        msg: { ...m, status: 'sent' },
      }))
      // 載入歷史的空檔裡若已經收到新訊息，要接在歷史後面，不能重複
      const extra = state.items.filter(
        (i) => i.kind === 'notice' || !action.history.some((h) => isSameMessage(h, i.msg)),
      )
      return { ...state, phase: 'joined', joinError: null, items: [...history, ...extra] }
    }
    case 'JOIN_FAIL':
      return { ...initialState, joinError: action.error }
    case 'LEFT':
      return initialState
    case 'MESSAGE_UPSERT': {
      const index = state.items.findIndex(
        (i) => i.kind === 'message' && isSameMessage(i.msg, action.message),
      )
      if (index === -1) return { ...state, items: [...state.items, { kind: 'message', msg: action.message }] }
      const items = state.items.slice()
      items[index] = { kind: 'message', msg: action.message }
      return { ...state, items }
    }
    case 'MESSAGE_STATUS':
      return {
        ...state,
        items: state.items.map((i) =>
          i.kind === 'message' && i.msg.client_msg_id === action.clientMsgId
            ? { kind: 'message', msg: { ...i.msg, status: action.status } }
            : i,
        ),
      }
    case 'PRESENCE_SYNC':
      return { ...state, online: action.list }
    case 'PRESENCE_SET':
      return {
        ...state,
        online: [...state.online.filter((p) => p.client_id !== action.info.client_id), action.info].sort(
          (a, b) => a.joined_at.localeCompare(b.joined_at),
        ),
      }
    case 'PRESENCE_REMOVE':
      return { ...state, online: state.online.filter((p) => p.client_id !== action.clientId) }
    case 'NOTICE':
      return { ...state, items: [...state.items, { kind: 'notice', notice: action.notice }] }
  }
}

export type SendResult = 'ok' | 'invalid' | 'slow'

export function useChat(service: ChatService, clientId: string) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [slowDown, setSlowDown] = useState(false)

  const unsubscribers = useRef<Array<() => void>>([])
  const leaveTimers = useRef(new Map<string, number>())
  const lastSentAt = useRef(0)
  const slowTimer = useRef<number | null>(null)
  // 失敗後重送需要原本的內容
  const sentContent = useRef(new Map<string, string>())

  const unsubscribe = useCallback(() => {
    unsubscribers.current.forEach((off) => off())
    unsubscribers.current = []
    leaveTimers.current.forEach((t) => window.clearTimeout(t))
    leaveTimers.current.clear()
  }, [])

  const subscribe = useCallback(() => {
    const grace = leaveGraceMs()
    unsubscribers.current = [
      service.on('message:new', (message) => {
        dispatch({ type: 'MESSAGE_UPSERT', message: { ...message, status: 'sent' } })
      }),
      service.on('presence:sync', (list) => dispatch({ type: 'PRESENCE_SYNC', list })),
      service.on('presence:join', (info) => {
        const pending = leaveTimers.current.get(info.client_id)
        if (pending !== undefined) {
          // 緩衝期內回來了：當作沒離開，不顯示任何提示
          window.clearTimeout(pending)
          leaveTimers.current.delete(info.client_id)
          dispatch({ type: 'PRESENCE_SET', info })
          return
        }
        if (info.client_id === clientId) return
        dispatch({ type: 'PRESENCE_SET', info })
        dispatch({
          type: 'NOTICE',
          notice: { id: newId(), kind: 'join', nickname: info.nickname, at: new Date().toISOString() },
        })
      }),
      service.on('presence:leave', (info) => {
        if (info.client_id === clientId || leaveTimers.current.has(info.client_id)) return
        const timer = window.setTimeout(() => {
          leaveTimers.current.delete(info.client_id)
          dispatch({ type: 'PRESENCE_REMOVE', clientId: info.client_id })
          dispatch({
            type: 'NOTICE',
            notice: { id: newId(), kind: 'leave', nickname: info.nickname, at: new Date().toISOString() },
          })
        }, grace)
        leaveTimers.current.set(info.client_id, timer)
      }),
    ]
  }, [service, clientId])

  const join = useCallback(
    async (nickname: string): Promise<JoinErrorCode | null> => {
      unsubscribe()
      dispatch({ type: 'JOIN_START', nickname })
      subscribe()
      try {
        await service.join(nickname)
        const history = await service.loadHistory()
        saveLastNickname(nickname)
        dispatch({ type: 'JOIN_OK', history })
        return null
      } catch (error) {
        unsubscribe()
        await service.leave()
        const code = error instanceof ChatError ? (error.code as JoinErrorCode) : 'CONNECTION_FAILED'
        dispatch({ type: 'JOIN_FAIL', error: code })
        return code
      }
    },
    [service, subscribe, unsubscribe],
  )

  const leave = useCallback(async () => {
    unsubscribe()
    sentContent.current.clear()
    dispatch({ type: 'LEFT' })
    await service.leave()
  }, [service, unsubscribe])

  const deliver = useCallback(
    (clientMsgId: string, content: string) => {
      service
        .sendMessage({ client_msg_id: clientMsgId, content })
        .then((message) => {
          sentContent.current.delete(clientMsgId)
          dispatch({ type: 'MESSAGE_UPSERT', message: { ...message, status: 'sent' } })
        })
        .catch(() => {
          dispatch({ type: 'MESSAGE_STATUS', clientMsgId, status: 'failed' })
        })
    },
    [service],
  )

  const send = useCallback(
    (raw: string): SendResult => {
      const normalized = normalizeMessage(raw)
      if (!normalized.ok) return 'invalid'

      if (Date.now() - lastSentAt.current < RATE_LIMIT_MS) {
        setSlowDown(true)
        if (slowTimer.current !== null) window.clearTimeout(slowTimer.current)
        slowTimer.current = window.setTimeout(() => setSlowDown(false), 2500)
        return 'slow'
      }
      lastSentAt.current = Date.now()

      const clientMsgId = newId()
      sentContent.current.set(clientMsgId, normalized.content)
      dispatch({
        type: 'MESSAGE_UPSERT',
        message: {
          id: `local:${clientMsgId}`,
          client_msg_id: clientMsgId,
          client_id: clientId,
          nickname: state.nickname,
          content: normalized.content,
          created_at: new Date().toISOString(),
          status: 'sending',
        },
      })
      deliver(clientMsgId, normalized.content)
      return 'ok'
    },
    [clientId, deliver, state.nickname],
  )

  const retry = useCallback(
    (clientMsgId: string) => {
      const content = sentContent.current.get(clientMsgId)
      if (content === undefined) return
      lastSentAt.current = Date.now()
      dispatch({ type: 'MESSAGE_STATUS', clientMsgId, status: 'sending' })
      deliver(clientMsgId, content)
    },
    [deliver],
  )

  // 離開頁面或元件被移除時，收拾乾淨
  useEffect(
    () => () => {
      unsubscribe()
      if (slowTimer.current !== null) window.clearTimeout(slowTimer.current)
    },
    [unsubscribe],
  )

  return { state, slowDown, join, leave, send, retry }
}
