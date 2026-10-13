import { useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TimelineItem } from '../chat/useChat'
import { ArrowDownIcon, MaskIcon } from './Icons'
import { MessageItem } from './MessageItem'

interface Props {
  items: TimelineItem[]
  clientId: string
  onRetry: (clientMsgId: string) => void
}

/** 離底部多近算「貼在底部」 */
const STICK_DISTANCE = 48

export function MessageList({ items, clientId, onRetry }: Props) {
  const { t } = useTranslation()
  const scroller = useRef<HTMLDivElement>(null)
  const stuckToBottom = useRef(true)
  const [hasUnread, setHasUnread] = useState(false)

  function scrollToBottom() {
    const el = scroller.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollTo({ top: el.scrollHeight, behavior: reduce ? 'auto' : 'smooth' })
    stuckToBottom.current = true
    setHasUnread(false)
  }

  // 有新內容時：在底部（或是自己剛說的話）就跟著捲下去；否則不打擾，改顯示「有新訊息」
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el || items.length === 0) return
    const last = items[items.length - 1]
    const mine = last.kind === 'message' && last.msg.client_id === clientId
    if (stuckToBottom.current || mine) {
      el.scrollTop = el.scrollHeight
      stuckToBottom.current = true
      setHasUnread(false)
    } else {
      setHasUnread(true)
    }
  }, [items.length, clientId])

  function handleScroll() {
    const el = scroller.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    stuckToBottom.current = distance < STICK_DISTANCE
    if (stuckToBottom.current) setHasUnread(false)
  }

  return (
    <div className="messages-wrap">
      <div className="messages" ref={scroller} onScroll={handleScroll}>
        {items.length === 0 ? (
          <div className="empty">
            <div className="mask-badge mask-badge--lg" aria-hidden="true">
              <MaskIcon size={40} />
            </div>
            <h2 className="empty__title">{t('room.emptyTitle')}</h2>
            <p className="empty__body">{t('room.emptyBody')}</p>
          </div>
        ) : (
          <div className="messages__inner">
            {items.map((item) =>
              item.kind === 'notice' ? (
                <p key={item.notice.id} className="notice">
                  {t(item.notice.kind === 'join' ? 'room.joined' : 'room.left', {
                    nickname: item.notice.nickname,
                  })}
                </p>
              ) : (
                <MessageItem
                  key={item.msg.client_msg_id}
                  message={item.msg}
                  isSelf={item.msg.client_id === clientId}
                  onRetry={onRetry}
                />
              ),
            )}
          </div>
        )}
      </div>
      {hasUnread && (
        <button type="button" className="new-messages" onClick={scrollToBottom}>
          {t('room.newMessages')}
          <ArrowDownIcon size={14} />
        </button>
      )}
    </div>
  )
}
