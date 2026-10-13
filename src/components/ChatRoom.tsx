import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PresenceInfo } from '../chat/types'
import type { SendResult, TimelineItem } from '../chat/useChat'
import { ChevronDownIcon, ChevronUpIcon, CloseIcon, ExitIcon } from './Icons'
import { MessageInput } from './MessageInput'
import { MessageList } from './MessageList'
import { OnlineList } from './OnlineList'
import { useMatchMedia } from './useMatchMedia'

interface Props {
  clientId: string
  items: TimelineItem[]
  online: PresenceInfo[]
  slowDown: boolean
  onSend: (text: string) => SendResult
  onRetry: (clientMsgId: string) => void
  onLeave: () => void
}

export function ChatRoom({ clientId, items, online, slowDown, onSend, onRetry, onLeave }: Props) {
  const { t } = useTranslation()
  const isWide = useMatchMedia('(min-width: 720px)')
  const [listOpen, setListOpen] = useState(false)
  const pill = useRef<HTMLButtonElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const count = online.length

  // 手機的名單面板：Esc 關閉；打開時焦點移進去，關閉後還給原本的按鈕
  useEffect(() => {
    if (!listOpen) return
    closeButton.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setListOpen(false)
    }
    window.addEventListener('keydown', onKey)
    const opener = pill.current
    return () => {
      window.removeEventListener('keydown', onKey)
      opener?.focus()
    }
  }, [listOpen])

  const showSheet = listOpen && !isWide

  return (
    <div className="room">
      <div className="room__main">
        <header className="room__header">
          <div className="room__brand">
            <h1 className="room__title">{t('app.title')}</h1>
            {isWide && (
              <span className="room__count">
                <span className="dot" aria-hidden="true" />
                {t('room.online', { count })}
              </span>
            )}
          </div>
          <div className="room__actions">
            {!isWide && (
              <button
                ref={pill}
                type="button"
                className="pill"
                aria-expanded={listOpen}
                aria-label={t(listOpen ? 'room.collapseList' : 'room.expandList', { count })}
                onClick={() => setListOpen((open) => !open)}
              >
                <span className="dot" aria-hidden="true" />
                {t('room.online', { count })}
                {listOpen ? <ChevronUpIcon size={16} /> : <ChevronDownIcon size={16} />}
              </button>
            )}
            <button type="button" className="btn-leave" aria-label={t('room.leaveAria')} onClick={onLeave}>
              <ExitIcon />
              <span className="btn-leave__label">{t('room.leave')}</span>
            </button>
          </div>
        </header>

        <MessageList items={items} clientId={clientId} onRetry={onRetry} />
        <MessageInput slowDown={slowDown} onSend={onSend} />
      </div>

      {isWide && (
        <aside className="room__side" aria-label={t('room.listAria')}>
          <h2 className="panel-title">{t('room.listTitle', { count })}</h2>
          <OnlineList online={online} clientId={clientId} />
        </aside>
      )}

      {showSheet && (
        <>
          <div className="backdrop" onClick={() => setListOpen(false)} />
          <section className="sheet" role="dialog" aria-modal="true" aria-label={t('room.listAria')}>
            <div className="sheet__grip" aria-hidden="true" />
            <div className="sheet__head">
              <h2 className="panel-title">{t('room.listTitle', { count })}</h2>
              <button
                ref={closeButton}
                type="button"
                className="btn-icon"
                aria-label={t('room.closeList')}
                onClick={() => setListOpen(false)}
              >
                <CloseIcon size={22} />
              </button>
            </div>
            <OnlineList online={online} clientId={clientId} />
          </section>
        </>
      )}
    </div>
  )
}
