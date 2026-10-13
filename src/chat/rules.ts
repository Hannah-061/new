// 共用規則：兩個階段、兩種後端都用同一份，行為才不會在階段二改變。
// 這些規則在前端只是為了好用；階段二真正的底線由資料庫把關（見架構文件第 9 節）。

export const NICKNAME_MIN = 2
export const NICKNAME_MAX = 10
export const MESSAGE_MAX = 500
export const HISTORY_LIMIT = 50
export const HISTORY_DAYS = 7
/** 兩次送出訊息的最短間隔 */
export const RATE_LIMIT_MS = 1000
/** 離開提示要等這麼久，期間同一個人回來就當作沒離開 */
export const LEAVE_GRACE_MS = 30_000
/** 離開後代號保留多久 */
export const RESERVATION_MS = 5 * 60_000
/** 在線時，每隔多久把保留時間往後延 */
export const RESERVATION_RENEW_MS = 60_000

/** 只允許中文、英文、數字 */
const NICKNAME_PATTERN = /^[\p{Script=Han}A-Za-z0-9]+$/u

export type NicknameProblem = 'empty' | 'length' | 'chars'

/** 計算字數時用「字元」而不是 JavaScript 的 UTF-16 單位 */
export function charCount(text: string): number {
  return Array.from(text).length
}

export function checkNickname(raw: string): NicknameProblem | null {
  if (raw.length === 0) return 'empty'
  if (!NICKNAME_PATTERN.test(raw)) return 'chars'
  const n = charCount(raw)
  if (n < NICKNAME_MIN || n > NICKNAME_MAX) return 'length'
  return null
}

/** 比對代號時不分大小寫 */
export function nicknameKey(nickname: string): string {
  return nickname.normalize('NFKC').toLowerCase()
}

// 零寬字元、方向控制字元、其他不可見的控制字元（換行除外）
// eslint-disable-next-line no-control-regex
const INVISIBLE = /[\u0000-\u0009\u000B-\u001F\u007F-\u009F​-‏‪-‮⁠-⁯﻿]/g

export type NormalizedMessage = { ok: true; content: string } | { ok: false }

/** 清掉隱形字元、去掉頭尾空白；空的或超過上限就不合格 */
export function normalizeMessage(raw: string): NormalizedMessage {
  const content = raw
    .replace(/\r\n?/g, '\n')
    .replace(INVISIBLE, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  if (content.length === 0 || charCount(content) > MESSAGE_MAX) return { ok: false }
  return { ok: true, content }
}

/** 網址 ?grace=3000 可以把 30 秒緩衝縮短，方便測試（只接受 0 到 30 秒） */
export function leaveGraceMs(search: string = window.location.search): number {
  const value = new URLSearchParams(search).get('grace')
  if (value === null) return LEAVE_GRACE_MS
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 && n <= LEAVE_GRACE_MS ? n : LEAVE_GRACE_MS
}

/** 代號顏色：依代號固定對應，每一個顏色在白底與暖白底上都夠深、看得清楚 */
const NICKNAME_COLORS = [
  '#2A7451',
  '#2F5DA8',
  '#A14A2B',
  '#7A4FA3',
  '#1F7A8C',
  '#9A6A00',
  '#B0356B',
  '#5B6B2A',
]

export function nicknameColor(nickname: string): string {
  const key = nicknameKey(nickname)
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  return NICKNAME_COLORS[hash % NICKNAME_COLORS.length]
}
