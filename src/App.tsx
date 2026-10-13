import { ChatRoom } from './components/ChatRoom'
import { EntryScreen } from './components/EntryScreen'
import { createChatService } from './chat/createChatService'
import { getClientId } from './chat/identity'
import { useChat } from './chat/useChat'

// 畫面只認得 ChatService 這份合約，不知道背後是假後端還是 Supabase。
const service = createChatService()
const clientId = getClientId()

export default function App() {
  const { state, slowDown, join, leave, send, retry } = useChat(service, clientId)

  if (state.phase === 'joined') {
    return (
      <ChatRoom
        clientId={clientId}
        items={state.items}
        online={state.online}
        slowDown={slowDown}
        onSend={send}
        onRetry={retry}
        onLeave={leave}
      />
    )
  }

  return <EntryScreen joining={state.phase === 'joining'} demo={service.kind === 'mock'} onJoin={join} />
}
