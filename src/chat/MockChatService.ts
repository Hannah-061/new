// 階段一的假後端：在瀏覽器裡模擬 Supabase 的行為，遵守 ChatService 合約。
//
//  - 訊息、代號保留：存在 localStorage（同一個瀏覽器的分頁共用）
//  - 在線名單、即時訊息：用 BroadcastChannel 在同一個瀏覽器的分頁之間傳話
//  - 示範機器人：見 mock/bots.ts
//
// 網址參數（只在示範模式有效，方便測試）：
//   ?demo=flaky    每則訊息第一次送出會失敗，點「重送」才會成功
//   ?demo=offline  所有訊息都送不出去
//   ?demo=down     進入聊天室時連不上
//   ?profile=b     換一組獨立的身分（見 identity.ts）
//   ?grace=3000    把離開提示的等待時間縮短（見 rules.ts）
import { Emitter, type ChatService } from './ChatService'
import { newId } from './identity'
import { MockBots } from './mock/bots'
import * as store from './mock/storage'
import {
  RATE_LIMIT_MS,
  RESERVATION_RENEW_MS,
  nicknameKey,
  normalizeMessage,
} from './rules'
import { ChatError, type ChatEvents, type ChatMessage, type PresenceInfo } from './types'

type Wire =
  | { type: 'who' }
  | { type: 'here'; to: string; info: PresenceInfo }
  | { type: 'hello'; info: PresenceInfo }
  | { type: 'bye'; info: PresenceInfo }
  | { type: 'message'; message: ChatMessage }

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

export class MockChatService implements ChatService {
  readonly kind = 'mock' as const

  private emitter = new Emitter()
  private channel: BroadcastChannel | null
  private peers = new Map<string, PresenceInfo>()
  private self: PresenceInfo | null = null
  private bots: MockBots | null = null
  private renewTimer: number | null = null
  private abortElection: AbortController | null = null
  private releaseLeadership: (() => void) | null = null
  private lastAccepted = 0
  private attempted = new Set<string>()
  private demo = new URLSearchParams(window.location.search).get('demo')

  constructor(private clientId: string) {
    this.channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('anonchat-mock-v1')
    if (this.channel) this.channel.onmessage = (e: MessageEvent<Wire>) => this.receive(e.data)
    window.addEventListener('pagehide', () => void this.leave())
  }

  on<E extends keyof ChatEvents>(event: E, handler: (payload: ChatEvents[E]) => void): () => void {
    return this.emitter.on(event, handler)
  }

  async join(nickname: string): Promise<void> {
    await wait(300)
    if (this.demo === 'down') throw new ChatError('CONNECTION_FAILED')
    if (this.self) await this.leave()

    // 先問問現在有誰在線上，再決定這個代號能不能用
    this.peers.clear()
    this.post({ type: 'who' })
    await wait(250)

    const key = nicknameKey(nickname)
    const holder = [...this.peers.values()].find(
      (p) => nicknameKey(p.nickname) === key && p.client_id !== this.clientId,
    )
    if (holder) throw new ChatError('NICKNAME_TAKEN')
    if (store.isReservedByOther(nickname, this.clientId)) throw new ChatError('NICKNAME_RESERVED')

    const self: PresenceInfo = {
      client_id: this.clientId,
      nickname,
      joined_at: new Date().toISOString(),
    }
    this.self = self
    store.reserve(nickname, this.clientId)
    this.renewTimer = window.setInterval(
      () => this.self && store.reserve(this.self.nickname, this.clientId),
      RESERVATION_RENEW_MS,
    )
    this.post({ type: 'hello', info: self })
    this.startBotElection()

    this.emitter.emit('connection:status', 'connected')
    this.emitter.emit('presence:sync', this.sortedPresence())
  }

  async leave(): Promise<void> {
    if (!this.self) return
    const info = this.self
    this.self = null
    if (this.renewTimer !== null) window.clearInterval(this.renewTimer)
    this.renewTimer = null
    this.abortElection?.abort()
    this.abortElection = null
    this.releaseLeadership?.()
    this.releaseLeadership = null
    this.peers.clear()
    this.post({ type: 'bye', info })
  }

  async loadHistory(): Promise<ChatMessage[]> {
    await wait(150)
    return store.loadMessages()
  }

  async sendMessage(input: { client_msg_id: string; content: string }): Promise<ChatMessage> {
    await wait(350)
    const firstTry = !this.attempted.has(input.client_msg_id)
    this.attempted.add(input.client_msg_id)
    if (this.demo === 'offline' || (this.demo === 'flaky' && firstTry)) {
      throw new ChatError('SEND_FAILED')
    }
    if (!this.self) throw new ChatError('SEND_FAILED')

    // 以下是「後端」該做的檢查（階段二由資料庫負責）
    const normalized = normalizeMessage(input.content)
    if (!normalized.ok) throw new ChatError('INVALID')
    if (Date.now() - this.lastAccepted < RATE_LIMIT_MS) throw new ChatError('RATE_LIMITED')
    this.lastAccepted = Date.now()

    const message: ChatMessage = {
      id: newId(),
      client_msg_id: input.client_msg_id,
      client_id: this.clientId,
      nickname: this.self.nickname,
      content: normalized.content,
      created_at: new Date().toISOString(),
    }
    this.publish(message)
    this.bots?.onHumanMessage()
    return message
  }

  // ---- 內部 ----

  private post(wire: Wire): void {
    this.channel?.postMessage(wire)
  }

  private sortedPresence(): PresenceInfo[] {
    const all = this.self ? [this.self, ...this.peers.values()] : [...this.peers.values()]
    return all.sort((a, b) => a.joined_at.localeCompare(b.joined_at))
  }

  /** 存起來、通知其他分頁、通知自己的畫面 */
  private publish(message: ChatMessage): void {
    store.saveMessage(message)
    this.post({ type: 'message', message })
    if (this.self) this.emitter.emit('message:new', message)
  }

  private receive(wire: Wire): void {
    switch (wire.type) {
      case 'who':
        if (this.self) this.post({ type: 'here', to: '*', info: this.self })
        this.bots?.onlineInfos().forEach((info) => this.post({ type: 'here', to: '*', info }))
        break
      case 'here':
        if (wire.info.client_id !== this.clientId) this.peers.set(wire.info.client_id, wire.info)
        break
      case 'hello': {
        if (wire.info.client_id === this.clientId) break
        const isNew = !this.peers.has(wire.info.client_id)
        this.peers.set(wire.info.client_id, wire.info)
        if (this.self && isNew) this.emitter.emit('presence:join', wire.info)
        break
      }
      case 'bye': {
        const known = this.peers.get(wire.info.client_id)
        if (!known) break
        this.peers.delete(wire.info.client_id)
        if (this.self) this.emitter.emit('presence:leave', known)
        break
      }
      case 'message':
        if (this.self) this.emitter.emit('message:new', wire.message)
        if (!wire.message.client_id.startsWith('bot:')) this.bots?.onHumanMessage()
        break
    }
  }

  /** 同一個瀏覽器只讓一個分頁操作機器人；那個分頁關掉後，由下一個分頁接手 */
  private startBotElection(): void {
    if (!('locks' in navigator)) {
      this.becomeBotLeader()
      return
    }
    const abort = new AbortController()
    this.abortElection = abort
    navigator.locks
      .request(
        'anonchat-mock-bots',
        { signal: abort.signal },
        () =>
          new Promise<void>((release) => {
            this.becomeBotLeader()
            this.releaseLeadership = () => {
              this.bots?.stop()
              this.bots = null
              release()
            }
          }),
      )
      .catch(() => {
        // 還在排隊時就離開了，不需要處理
      })
  }

  private becomeBotLeader(): void {
    if (!this.self) return
    this.bots = new MockBots({
      joinPeers: (infos) => {
        infos.forEach((info) => {
          this.peers.set(info.client_id, info)
          this.post({ type: 'hello', info })
        })
        if (this.self) this.emitter.emit('presence:sync', this.sortedPresence())
      },
      joinPeer: (info) => {
        this.peers.set(info.client_id, info)
        this.post({ type: 'hello', info })
        if (this.self) this.emitter.emit('presence:join', info)
      },
      leavePeer: (info) => {
        this.peers.delete(info.client_id)
        this.post({ type: 'bye', info })
        if (this.self) this.emitter.emit('presence:leave', info)
      },
      say: (bot, content) =>
        this.publish({
          id: newId(),
          client_msg_id: newId(),
          client_id: bot.client_id,
          nickname: bot.nickname,
          content,
          created_at: new Date().toISOString(),
        }),
      renewReservation: (nickname, clientId) => store.reserve(nickname, clientId),
    })
    this.bots.start()
  }
}
