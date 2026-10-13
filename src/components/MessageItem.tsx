import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import type { DisplayMessage } from '../chat/useChat'
import { linkify } from '../chat/linkify'
import { nicknameColor } from '../chat/rules'
import { ClockIcon, RetryIcon } from './Icons'

export function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 內容一律當純文字顯示；只有 http/https 網址會變成連結 */
function Content({ text }: { text: string }) {
  return (
    <>
      {linkify(text).map((segment, i) =>
        segment.type === 'link' ? (
          <a key={i} href={segment.href} target="_blank" rel="noopener noreferrer nofollow">
            {segment.value}
          </a>
        ) : (
          <Fragment key={i}>{segment.value}</Fragment>
        ),
      )}
    </>
  )
}

interface Props {
  message: DisplayMessage
  isSelf: boolean
  onRetry: (clientMsgId: string) => void
}

export function MessageItem({ message, isSelf, onRetry }: Props) {
  const { t } = useTranslation()
  const time = formatTime(message.created_at)

  if (!isSelf) {
    return (
      <div className="msg msg--other">
        <span className="msg__name" style={{ color: nicknameColor(message.nickname) }}>
          {message.nickname}
        </span>
        <div className="msg__row">
          <div className="bubble bubble--other">
            <Content text={message.content} />
          </div>
          <span className="msg__time">{time}</span>
        </div>
      </div>
    )
  }

  if (message.status === 'failed') {
    return (
      <div className="msg msg--self">
        <button type="button" className="bubble bubble--failed" onClick={() => onRetry(message.client_msg_id)}>
          <span className="bubble__text">{message.content}</span>
          <span className="bubble__retry">
            <RetryIcon size={14} />
            {t('room.failed')}
          </span>
        </button>
      </div>
    )
  }

  const sending = message.status === 'sending'
  return (
    <div className="msg msg--self">
      <div className="msg__row msg__row--self">
        {sending ? (
          <span className="msg__status">
            <ClockIcon size={14} />
            {t('room.sending')}
          </span>
        ) : (
          <span className="msg__time">{time}</span>
        )}
        <div className={sending ? 'bubble bubble--self bubble--sending' : 'bubble bubble--self'}>
          <Content text={message.content} />
        </div>
      </div>
    </div>
  )
}
