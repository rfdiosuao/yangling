/* 养令 · 本地推送服务器（PWA 验证用最小实现）
 *
 * 作用：让"关闭页面也能收到提醒"这条链路可验证。
 *   - 保存前端发来的 PushSubscription
 *   - 到点调用 web-push 发送（手动触发一次测试推送 / 定时轮询）
 *
 * 启动：
 *   node scripts/push-server.mjs
 *
 * 接口：
 *   GET  /vapid              → { publicKey }            前端订阅前先拿公钥
 *   POST /subscribe          → body: PushSubscription    前端把订阅发过来保存
 *   POST /send               → body: { title, body, url, tag }  手动触发一次推送
 *   GET  /subscriptions      → 查看已存订阅数
 *
 * 第一次启动会自动生成 VAPID 密钥对并保存在 .vapid.json（勿提交到仓库）。
 * 注意：web-push 发送依赖浏览器厂商推送通道（Chrome 走 FCM），国内网络需要能连通，
 *       这正是本次要"先验证"的点。
 */
import { createRequire } from 'module'
import http from 'http'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)
const webpush = require('web-push')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const VAPID_FILE = path.join(__dirname, '..', '.vapid.json')
const SUB_FILE = path.join(__dirname, '..', '.subscriptions.json')
const PORT = process.env.PORT || 8788
const SEND_INTERVAL_MIN = Number(process.env.SEND_INTERVAL_MIN || 0) // 0 = 不自动发，手动 POST /send

/* --- VAPID 密钥：没有就生成 --- */
function loadOrCreateVapid() {
  if (existsSync(VAPID_FILE)) {
    return JSON.parse(readFileSync(VAPID_FILE, 'utf8'))
  }
  const keys = webpush.generateVAPIDKeys()
  writeFileSync(VAPID_FILE, JSON.stringify(keys, null, 2))
  console.log('[vapid] 已生成新密钥对并保存到 .vapid.json')
  return keys
}

/* --- 订阅存储：本地 JSON 文件 --- */
function loadSubscriptions() {
  try { return JSON.parse(readFileSync(SUB_FILE, 'utf8')) } catch { return [] }
}
function saveSubscriptions(list) {
  mkdirSync(path.dirname(SUB_FILE), { recursive: true })
  writeFileSync(SUB_FILE, JSON.stringify(list, null, 2))
}

const vapid = loadOrCreateVapid()
webpush.setVapidDetails(
  'mailto:yangling@example.com',
  vapid.publicKey,
  vapid.privateKey,
)

function sendToSubscriptions(sub, payload) {
  return webpush.sendNotification(sub, JSON.stringify(payload))
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const json = (code, body) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type' }); res.end(JSON.stringify(body)) }
  if (req.method === 'OPTIONS') return json(204, {})
  const readBody = () => new Promise(resolve => { let data = ''; req.on('data', c => data += c); req.on('end', () => { try { resolve(JSON.parse(data || '{}')) } catch { resolve({}) } }) })

  if (req.method === 'GET' && url.pathname === '/vapid') return json(200, { publicKey: vapid.publicKey })
  if (req.method === 'GET' && url.pathname === '/subscriptions') return json(200, { count: loadSubscriptions().length })
  if (req.method === 'POST' && url.pathname === '/subscribe') {
    return readBody().then(async sub => {
      if (!sub || !sub.endpoint) return json(400, { ok: false, error: '缺少 subscription' })
      const list = loadSubscriptions().filter(item => item.endpoint !== sub.endpoint)
      list.push(sub)
      saveSubscriptions(list)
      console.log(`[subscribe] 已保存订阅（当前 ${list.length} 条）`)
      // 订阅成功立即发一条测试通知，让用户当场看到"页面关掉也能收到"
      sendToSubscriptions(sub, { title: '养令推送已接通', body: '现在关掉这个页面，我还能找到你。', url: './#home', tag: 'yangling-test' })
        .then(() => console.log('[subscribe] 测试通知已发送'))
        .catch(err => console.warn('[subscribe] 测试通知失败：', err.message))
      json(200, { ok: true, count: list.length })
    })
  }
  if (req.method === 'POST' && url.pathname === '/send') {
    return readBody().then(async payload => {
      const list = loadSubscriptions()
      if (!list.length) return json(400, { ok: false, error: '还没有订阅，请先在 App 里开启推送' })
      const { title = '该起身养生啦', body = '做一次「一息」，给身体一点恢复的时间。', url = './#home', tag = 'yangling-reminder' } = payload
      let sent = 0, failed = 0
      await Promise.all(list.map(sub => sendToSubscriptions(sub, { title, body, url, tag })
        .then(() => sent++)
        .catch(() => failed++)))
      console.log(`[send] 推送完成：成功 ${sent}，失败 ${failed}`)
      json(200, { ok: true, sent, failed })
    })
  }
  json(404, { ok: false, error: 'not found' })
})

server.listen(PORT, () => {
  console.log(`养令推送服务器已启动  http://localhost:${PORT}`)
  console.log(`VAPID 公钥（填入 App 提醒设置）:\n${vapid.publicKey}`)
  if (SEND_INTERVAL_MIN > 0) {
    setInterval(() => {
      const list = loadSubscriptions()
      if (!list.length) return
      console.log(`[auto] 到点，向 ${list.length} 条订阅推送「该起身养生啦」`)
      Promise.all(list.map(sub => sendToSubscriptions(sub, { title: '该起身养生啦', body: '做一次「一息」，给身体一点恢复的时间。', url: './#home', tag: 'yangling-reminder' }).catch(() => {})))
    }, SEND_INTERVAL_MIN * 60 * 1000)
  }
})
