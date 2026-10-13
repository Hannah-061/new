// 示範機器人：讓階段一的聊天室看起來有人在，方便看到進出提示、名單變化、不同人的訊息。
// 同一個瀏覽器只有一個分頁在操作機器人（用 Web Locks 選出），避免每個分頁各演各的。
// 階段二接上 Supabase 後，這個檔案連同整個 mock/ 資料夾都可以移除。
import type { PresenceInfo } from '../types'

interface BotHost {
  joinPeers(infos: PresenceInfo[]): void
  joinPeer(info: PresenceInfo): void
  leavePeer(info: PresenceInfo): void
  say(bot: PresenceInfo, content: string): void
  renewReservation(nickname: string, clientId: string): void
}

const ROSTER = ['Mika', '阿凱', '小明', 'Leo', '星期三']
const START_ONLINE = 3

const LINES = [
  '有人還沒睡嗎？明天又要早起，但就是不想睡。',
  '剛下班，終於到家了。',
  '外面在下雨耶，聽起來很舒服。',
  '晚餐吃了泡麵，罪惡感好重。',
  '有沒有什麼歌可以推薦？',
  '最近一直循環這首：https://example.com/song/1024',
  '明天週五了，再撐一下。',
  '你們都幾點睡？',
  '我剛看完一部電影，結局有點意外。',
  '宵夜吃什麼好，好難決定。',
  '今天的月亮好亮。',
  '突然想起來還有東西沒洗⋯⋯算了明天再說。',
]

const REPLIES = ['哈哈，真的', '我也是', '同感！', '然後呢？', '這個我有聽過', '好欸', '真的假的', '+1']

const rand = (min: number, max: number) => min + Math.random() * (max - min)
const pick = <T>(list: T[]): T => list[Math.floor(Math.random() * list.length)]

export class MockBots {
  private bots: PresenceInfo[]
  private online = new Set<string>()
  private timers = new Set<number>()
  private running = false
  private lastSpeaker = ''

  constructor(private host: BotHost) {
    this.bots = ROSTER.map((nickname) => ({
      client_id: `bot:${nickname}`,
      nickname,
      joined_at: new Date().toISOString(),
    }))
  }

  onlineInfos(): PresenceInfo[] {
    return this.bots.filter((b) => this.online.has(b.client_id))
  }

  start(): void {
    if (this.running) return
    this.running = true
    // 剛開場時機器人是一次到齊，不用一個一個跳出「加入了聊天室」
    const initial = this.bots
      .slice(0, START_ONLINE)
      .map((b) => ({ ...b, joined_at: new Date().toISOString() }))
    initial.forEach((b) => {
      this.online.add(b.client_id)
      this.host.renewReservation(b.nickname, b.client_id)
    })
    this.host.joinPeers(initial)
    this.later(rand(6_000, 12_000), () => this.chatter())
    this.later(rand(70_000, 120_000), () => this.churn())
    this.every(60_000, () =>
      this.onlineInfos().forEach((b) => this.host.renewReservation(b.nickname, b.client_id)),
    )
  }

  stop(): void {
    if (!this.running) return
    this.running = false
    this.timers.forEach((t) => {
      window.clearTimeout(t)
      window.clearInterval(t)
    })
    this.timers.clear()
    this.onlineInfos().forEach((b) => this.botLeave(b))
  }

  /** 有真人說話時，機器人偶爾回一句 */
  onHumanMessage(): void {
    if (!this.running || Math.random() > 0.45) return
    const candidates = this.onlineInfos()
    if (candidates.length === 0) return
    const bot = pick(candidates)
    this.later(rand(1_500, 4_000), () => {
      if (this.online.has(bot.client_id)) this.host.say(bot, pick(REPLIES))
    })
  }

  private botJoin(bot: PresenceInfo): void {
    const info = { ...bot, joined_at: new Date().toISOString() }
    this.online.add(bot.client_id)
    this.host.renewReservation(info.nickname, info.client_id)
    this.host.joinPeer(info)
  }

  private botLeave(bot: PresenceInfo): void {
    this.online.delete(bot.client_id)
    this.host.leavePeer(bot)
  }

  private chatter(): void {
    const speakers = this.onlineInfos().filter((b) => b.client_id !== this.lastSpeaker)
    if (speakers.length > 0) {
      const bot = pick(speakers)
      this.lastSpeaker = bot.client_id
      this.host.say(bot, pick(LINES))
    }
    this.later(rand(15_000, 40_000), () => this.chatter())
  }

  private churn(): void {
    const online = this.onlineInfos()
    const offline = this.bots.filter((b) => !this.online.has(b.client_id))
    if (online.length > 2 && (offline.length === 0 || Math.random() < 0.5)) {
      this.botLeave(pick(online))
    } else if (offline.length > 0) {
      this.botJoin(pick(offline))
    }
    this.later(rand(70_000, 150_000), () => this.churn())
  }

  private later(ms: number, fn: () => void): void {
    const t = window.setTimeout(() => {
      this.timers.delete(t)
      if (this.running) fn()
    }, ms)
    this.timers.add(t)
  }

  private every(ms: number, fn: () => void): void {
    this.timers.add(window.setInterval(fn, ms))
  }
}
