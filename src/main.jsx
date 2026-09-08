import React from 'react'
import ReactDOM from 'react-dom/client'
import MobileApp from './mobile/MobileApp.jsx'
import { Capacitor } from '@capacitor/core'

// Keep the existing workbench accessible while the mobile app becomes the entry point.
const LegacyApp = React.lazy(async () => {
  await import('./theme/tokens.css')
  return import('./App.jsx')
})
const legacy = new URLSearchParams(window.location.search).has('legacy')

// PWA：仅生产环境注册 Service Worker（避免 dev 缓存干扰；GH Pages 子路径用相对路径）
document.documentElement.classList.toggle('native-app', Capacitor.isNativePlatform())
if (!legacy && !Capacitor.isNativePlatform() && import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* 注册失败不影响页面 */ })
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {legacy ? <React.Suspense fallback={<p>正在打开工作台…</p>}><LegacyApp /></React.Suspense> : <MobileApp />}
  </React.StrictMode>
)
