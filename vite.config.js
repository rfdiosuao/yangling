import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  // dev 用根路径('/');build 用 GH Pages 子路径('/yangling/',与仓库名一致)
  // BrowserRouter 的 basename 必须 '/' 开头,故不能用 './'(否则 React 挂载失败)
  // APK(Capacitor)构建时设置 VITE_BASE=./ 使用相对路径,适配 WebView 加载
  base: process.env.VITE_BASE || (command === 'build' ? '/yangling/' : '/'),
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
}))
