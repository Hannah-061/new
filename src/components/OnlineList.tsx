import { useTranslation } from 'react-i18next'
import type { PresenceInfo } from '../chat/types'

interface Props {
  online: PresenceInfo[]
  clientId: string
}

export function OnlineList({ online, clientId }: Props) {
  const { t } = useTranslation()
  // 自己排第一個，其他人依加入先後
  const sorted = [...online].sort((a, b) =>
    a.client_id === clientId ? -1 : b.client_id === clientId ? 1 : a.joined_at.localeCompare(b.joined_at),
  )
  return (
    <ul className="online-list">
      {sorted.map((p) => (
        <li key={p.client_id} className="online-list__item">
          <span className="dot" aria-hidden="true" />
          <span className="online-list__name">{p.nickname}</span>
          {p.client_id === clientId && <span className="you-tag">{t('room.you')}</span>}
        </li>
      ))}
    </ul>
  )
}
