import { useSyncExternalStore } from 'react'

/** 目前的螢幕是否符合某個 CSS 媒體查詢（例如寬度 720px 以上） */
export function useMatchMedia(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', notify)
      return () => mq.removeEventListener('change', notify)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}
