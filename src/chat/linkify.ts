// 把訊息裡的網址切出來。只認 http:// 與 https://，其他（例如 javascript:）一律當一般文字。

export type Segment = { type: 'text'; value: string } | { type: 'link'; value: string; href: string }

const URL_PATTERN = /https?:\/\/[^\s<>"'`]+/gi
// 網址後面不該算進去的標點（含全形標點）
const TRAILING = /[.,;:!?)\]}>，。、；：！？）】》」』]+$/u

export function linkify(text: string): Segment[] {
  const segments: Segment[] = []
  let last = 0

  for (const match of text.matchAll(URL_PATTERN)) {
    const start = match.index ?? 0
    let url = match[0]
    // 全形標點通常是中文句子的標點，不是網址的一部分
    const cjkPunct = url.search(/[　-〿＀-￯]/)
    if (cjkPunct > 0) url = url.slice(0, cjkPunct)
    url = url.replace(TRAILING, '')

    let href: string | null = null
    try {
      const parsed = new URL(url)
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') href = parsed.href
    } catch {
      href = null
    }
    if (!href) continue

    if (start > last) segments.push({ type: 'text', value: text.slice(last, start) })
    segments.push({ type: 'link', value: url, href })
    last = start + url.length
  }

  if (last < text.length) segments.push({ type: 'text', value: text.slice(last) })
  return segments
}
