/* 养令 Service Worker
 * - 静态资源缓存（cache-first，版本号控制）
 * - push 事件：Web Push 推送 → 系统通知
 * - notificationclick：点击通知聚焦/直达养生页
 * 部署到 GitHub Pages 子路径 /yangling/，全部用相对路径，避免 base 差异。
 */
const VERSION = 'yangling-v3-20260908'
const ASSET_CACHE = `${VERSION}-assets`

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== ASSET_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

/* 静态资源：缓存优先，回退网络（失败即放弃） */
self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.endsWith('/sockjs-node') || url.pathname.includes('/@vite/')) return
  if (url.pathname.includes('/push/') || url.pathname.includes('/api/')) return
  // Always revalidate the entry document so deployments cannot pin an old bundle.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req, { cache: 'no-cache' }).then(async response => {
      if (response.ok) { const cache = await caches.open(ASSET_CACHE); await cache.put(req, response.clone()) }
      return response
    }).catch(async () => (await caches.match(req)) || (await caches.match(new URL('./', self.registration.scope))) || Response.error()))
    return
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached
      return fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone()
          caches.open(ASSET_CACHE).then((cache) => cache.put(req, clone))
        }
        return res
      })
    })
  )
})

/* Web Push：服务器推送 → 系统通知 */
self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { /* 非 JSON payload 忽略 */ }
  const title = data.title || '该起身养生啦'
  const body = data.body || '做一次「一息」，给身体一点恢复的时间。'
  const options = {
    body,
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    tag: data.tag || 'yangling-reminder',
    renotify: true,
    vibrate: [120, 60, 120],
    data: { url: data.url || './#home' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

/* 点击通知：聚焦已开页面并直达目标，否则新开窗口 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = event.notification.data?.url || './#home'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus()
          if ('navigate' in client) {
            try { return client.navigate(target) } catch { /* 跨源时忽略 */ }
          }
          return client.postMessage({ type: 'yangling:navigate', url: target })
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target)
    })
  )
})
