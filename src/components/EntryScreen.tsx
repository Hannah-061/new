import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { getLastNickname } from '../chat/identity'
import { NICKNAME_MAX, checkNickname } from '../chat/rules'
import type { JoinErrorCode } from '../chat/types'
import { AlertIcon, ArrowRightIcon, MaskIcon } from './Icons'

interface Props {
  joining: boolean
  demo: boolean
  onJoin: (nickname: string) => Promise<JoinErrorCode | null>
}

export function EntryScreen({ joining, demo, onJoin }: Props) {
  const { t } = useTranslation()
  const [value, setValue] = useState(getLastNickname)
  const [touched, setTouched] = useState(false)
  const [serverError, setServerError] = useState<JoinErrorCode | null>(null)

  const problem = checkNickname(value)
  // 打到一半（只有 1 個字）不要急著罵人；有不能用的字元則馬上說
  const formatError =
    value.length > 0 && (problem === 'chars' || (problem === 'length' && touched)) ? problem : null
  const errorText = formatError ? t(`errors.${formatError}`) : serverError ? t(`errors.${serverError}`) : ''

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (problem !== null || joining) return
    setServerError(null)
    setServerError(await onJoin(value))
  }

  return (
    <main className="entry">
      <header className="entry__intro">
        <div className="mask-badge" aria-hidden="true">
          <MaskIcon size={28} />
        </div>
        <div className="entry__heading">
          <h1 className="entry__title">{t('app.title')}</h1>
          <p className="entry__lede">{t('entry.intro')}</p>
        </div>
      </header>

      <form className="entry__form" onSubmit={submit} noValidate>
        <label className="entry__label" htmlFor="nickname">
          {t('entry.nicknameLabel')}
        </label>
        <input
          id="nickname"
          className="entry__input"
          type="text"
          value={value}
          maxLength={NICKNAME_MAX}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="go"
          aria-invalid={errorText !== ''}
          aria-describedby="nickname-hint nickname-error"
          onChange={(e) => {
            setValue(e.target.value.trim())
            setServerError(null)
          }}
          onBlur={() => setTouched(true)}
        />
        <span id="nickname-hint" className="entry__hint">
          {t('entry.nicknameHint')}
        </span>
        <div id="nickname-error" className="entry__error" role="alert">
          {errorText && (
            <>
              <AlertIcon size={18} />
              <span>{errorText}</span>
            </>
          )}
        </div>
        <button className="btn-cta" type="submit" disabled={problem !== null || joining}>
          {joining ? t('entry.joining') : t('entry.submit')}
          {!joining && <ArrowRightIcon />}
        </button>
      </form>

      <footer className="entry__footer">
        <p className="entry__note">{t('entry.privacy')}</p>
        {demo && <p className="demo-chip">{t('entry.demo')}</p>}
      </footer>
    </main>
  )
}
