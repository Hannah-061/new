# CLAUDE.md

匿名聊天室：不用登入，輸入代號就能和所有在線的人即時聊天，前端放在 GitHub Pages，即時傳訊與歷史訊息用 Supabase。

## 規則

- 開始任何工作前，先讀 `docs/architecture.md`。需求背景在 `docs/requirements.md`。
- 目前在**階段一**：只做前端，後端用 MockChatService（假後端），還不要接 Supabase。
- 不可以把金鑰檔案 commit 進 git（`.env`、`.env.local` 等）。只有 `.env.example` 可以 commit。祕密金鑰（`service_role`）和資料庫密碼完全不要出現在專案裡。
