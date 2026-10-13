import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { SendResult } from '../chat/useChat'
import { MESSAGE_MAX, charCount } from '../chat/rules'
import { ArrowUpIcon } from './Icons'
import { useMatchMedia } from './useMatchMedia'

interface Props {
  slowDown: boolean
  onSend: (text: string) => SendResult
}

/** 字數剩這麼多以下才開始提醒 */
const COUNTER_FROM = 50
const MAX_HEIGHT = 140

export function MessageInput({ slowDown, onSend }: Props) {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const field = useRef<HTMLTextAreaElement>(null)
  // 有實體鍵盤（電腦）：Enter 送出、Shift+Enter 換行。手機：Enter 是換行，靠按鈕送出。
  const enterSends = useMatchMedia('(hover: hover) and (pointer: fine)')

  useLayoutEffect(() => {
    const el = field.current
    if (!el) return
    el.style.height = 'auto'
    // box-sizing 是 border-box，scrollHeight 不含邊框，要補上才不會出現多餘的捲軸
    const wanted = el.scrollHeight + (el.offsetHeight - el.clientHeight)
    el.style.height = `${Math.min(wanted, MAX_HEIGHT)}px`
    el.style.overflowY = wanted > MAX_HEIGHT ? 'auto' : 'hidden'
  }, [value])

  useEffect(() => {
    if (enterSends) field.current?.focus()
  }, [enterSends])

  const remaining = MESSAGE_MAX - charCount(value)
  const empty = value.trim().length === 0

  function submit() {
    if (empty) return
    if (onSend(value) === 'ok') {
      setValue('')
      field.current?.focus()
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // 中文輸入法選字時按 Enter 是「確定選字」，不能當成送出
    if (event.nativeEvent.isComposing || event.keyCode === 229) return
    if (enterSends && event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <div className="composer__meta">
        <span className="composer__slow" role="status">
          {slowDown ? t('room.slowDown') : ''}
        </span>
        {remaining <= COUNTER_FROM && (
          <span className="composer__count">{t('room.remaining', { count: Math.max(remaining, 0) })}</span>
        )}
      </div>
      <div className="composer__row">
        <label className="visually-hidden" htmlFor="message">
          {t('room.inputLabel')}
        </label>
        <textarea
          id="message"
          ref={field}
          className="composer__field"
          rows={1}
          maxLength={MESSAGE_MAX}
          value={value}
          placeholder={enterSends ? t('room.placeholderDesktop') : t('room.placeholder')}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button type="submit" className="btn-send" disabled={empty} aria-label={t('room.sendAria')}>
          <span className="btn-send__label">{t('room.send')}</span>
          <ArrowUpIcon size={20} />
        </button>
      </div>
    </form>
  )
}
