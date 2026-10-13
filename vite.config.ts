import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 的網址是 https://<帳號>.github.io/<repo 名稱>/，
// 所以網頁必須知道自己放在 /<repo 名稱>/ 底下，否則會找不到檔案（白畫面）。
// repo 名稱改了，只要改這一行，或在建置時設定環境變數 VITE_BASE。
export default defineConfig({
  base: process.env.VITE_BASE ?? '/new/',
  plugins: [react()],
})
