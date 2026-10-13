// 這個瀏覽器的匿名身分，以及「記住上次的代號」。存在 localStorage。
// 網址加 ?profile=b 可以換一組獨立的身分，方便在同一個瀏覽器開兩個分頁扮演兩個人。

function profileSuffix(): string {
  const profile = new URLSearchParams(window.location.search).get('profile')
  return profile ? `.${profile.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 20)}` : ''
}

const key = (name: string) => `anonchat.${name}${profileSuffix()}`

function read(name: string): string | null {
  try {
    return window.localStorage.getItem(key(name))
  } catch {
    return null
  }
}

function write(name: string, value: string): void {
  try {
    window.localStorage.setItem(key(name), value)
  } catch {
    // 無痕模式或被封鎖時，沒有記憶功能也要能正常使用
  }
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

let cachedClientId: string | null = null

export function getClientId(): string {
  if (cachedClientId) return cachedClientId
  let id = read('clientId')
  if (!id) {
    id = newId()
    write('clientId', id)
  }
  cachedClientId = id
  return id
}

export function getLastNickname(): string {
  return read('nickname') ?? ''
}

export function saveLastNickname(nickname: string): void {
  write('nickname', nickname)
}
