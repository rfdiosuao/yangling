/* 养令 · 主动提醒模块（PWA 验证版）
 * - 独特别称：按节气 × 季节五行 生成
 * - 使用时长：页面会话计时 + localStorage 按日累计（数据只存本机）
 * - 提醒：设置持久化 + 页面内 Notification 保底 + Web Push 订阅
 * 纯函数部分与浏览器解耦，便于 vitest 测试。
 */

import {normalizeReminder} from './reminder-schedule.js'
export const REMINDER_KEY = 'yangling:reminder:v1'
export const USAGE_KEY = 'yangling:usage:v1'
export const ALIAS_KEY = 'yangling:alias:v1'

/* 2026 年二十四节气（公历，用于别称与顺时文案；跨年数据另补） */
export const SOLAR_TERMS_2026 = [
  ['2026-01-05', '小寒'], ['2026-01-20', '大寒'], ['2026-02-04', '立春'], ['2026-02-18', '雨水'],
  ['2026-03-05', '惊蛰'], ['2026-03-20', '春分'], ['2026-04-05', '清明'], ['2026-04-20', '谷雨'],
  ['2026-05-05', '立夏'], ['2026-05-21', '小满'], ['2026-06-05', '芒种'], ['2026-06-21', '夏至'],
  ['2026-07-07', '小暑'], ['2026-07-23', '大暑'], ['2026-08-07', '立秋'], ['2026-08-23', '处暑'],
  ['2026-09-07', '白露'], ['2026-09-23', '秋分'], ['2026-10-08', '寒露'], ['2026-10-23', '霜降'],
  ['2026-11-07', '立冬'], ['2026-11-22', '小雪'], ['2026-12-07', '大雪'], ['2026-12-22', '冬至'],
]

const SEASON_ELEMENT = { '小寒': '冬水', '大寒': '冬水', '立春': '春木', '雨水': '春木', '惊蛰': '春木', '春分': '春木', '清明': '春木', '谷雨': '春木', '立夏': '夏火', '小满': '夏火', '芒种': '夏火', '夏至': '夏火', '小暑': '夏火', '大暑': '夏火', '立秋': '秋金', '处暑': '秋金', '白露': '秋金', '秋分': '秋金', '寒露': '秋金', '霜降': '秋金', '立冬': '冬水', '小雪': '冬水', '大雪': '冬水', '冬至': '冬水' }
const ALIAS_SUFFIX = ['令主', '小养', '阿令', '顺时人', '守时人']

export function fmtDate(date = new Date()) {
  const y = date.getFullYear(), m = String(date.getMonth() + 1).padStart(2, '0'), d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/* 返回当前节气名（按日期落在哪两个节气之间；同年无数据时回退「顺时」） */
export function getSolarTerm(date = new Date(), terms = SOLAR_TERMS_2026) {
  const key = fmtDate(date)
  const year = String(date.getFullYear())
  let current = '顺时'
  for (const [d, name] of terms) {
    if (!d.startsWith(year)) continue
    if (key >= d) current = name
    else break
  }
  return current
}

/* 独特别称：节气·五行 + 稳定随机后缀（同一用户/同一天固定） */
export function generateAlias(date = new Date(), rand = Math.random, terms = SOLAR_TERMS_2026) {
  const term = getSolarTerm(date, terms)
  const element = SEASON_ELEMENT[term] || '顺时'
  const seed = Math.floor(rand() * ALIAS_SUFFIX.length)
  return `${term}${element} · ${ALIAS_SUFFIX[seed]}`
}

/* 时长格式化 */
export function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds))
  if (s < 60) return `${s} 秒`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} 分钟`
  return `${Math.floor(m / 60)} 小时 ${m % 60} 分钟`
}

/* ---- 提醒设置（localStorage，storage 可注入便于测试） ---- */
export const DEFAULT_REMINDER = normalizeReminder({ enabled: false, intervalMin: 45, beforeSleep: 23 })

export function loadReminder(storage = globalThis.localStorage) {
  try { return normalizeReminder({ ...DEFAULT_REMINDER, ...(JSON.parse(storage?.getItem(REMINDER_KEY) || '{}')) }) } catch { return normalizeReminder(DEFAULT_REMINDER) }
}

export function saveReminder(reminder, storage = globalThis.localStorage) {
  const next = normalizeReminder({ ...DEFAULT_REMINDER, ...reminder })
  storage?.setItem(REMINDER_KEY, JSON.stringify(next))
  return next
}

export function loadAlias(storage = globalThis.localStorage) {
  return storage?.getItem(ALIAS_KEY) || ''
}

export function saveAlias(alias, storage = globalThis.localStorage) {
  storage?.setItem(ALIAS_KEY, alias)
  return alias
}

/* ---- 使用时长（按日累计，数据只存本机） ---- */
export function getUsageKey(date = new Date()) { return `${USAGE_KEY}:${fmtDate(date)}` }

export function loadTodaySeconds(storage = globalThis.localStorage, date = new Date()) {
  try { return Math.max(0, Number(storage?.getItem(getUsageKey(date)) || 0) || 0) } catch { return 0 }
}

/* 累计时长并写回；由页面定时/失焦时调用 */
export function addTodaySeconds(seconds, storage = globalThis.localStorage, date = new Date()) {
  const next = loadTodaySeconds(storage, date) + Math.max(0, Math.floor(seconds || 0))
  storage?.setItem(getUsageKey(date), String(next))
  return next
}

/* ---- 提醒文案模板（督促系 / 温情系，均为非医疗表述） ---- */
export function pickTemplate(alias, minutes, kind = 'chill') {
  const name = alias || '朋友'
  const actions = ['做一次「一息」', '起来舒展一下肩颈', '喝一杯温水，慢慢来']
  const action = actions[(minutes || 0) % actions.length]
  if (kind === 'nudge') {
    return {
      title: `${name}，该起身啦`,
      body: `你已经用了 ${minutes} 分钟，${action}，不然身体要闹脾气了～`,
    }
  }
  return {
    title: `给 ${name} 的一点点休息`,
    body: `用了 ${minutes} 分钟啦，${action}，照顾好自己。`,
  }
}

/* ---- 浏览器能力层（非浏览器环境安全返回 false/null） ---- */
export function notificationSupported() {
  return typeof globalThis.Notification !== 'undefined'
}

export async function ensureNotificationPermission() {
  if (!notificationSupported()) return 'unsupported'
  const permission = await globalThis.Notification.requestPermission()
  return permission
}

export function showLocalNotification(title, body, { tag = 'yangling-local', data = {}, onClick } = {}) {
  if (!notificationSupported() || globalThis.Notification.permission !== 'granted') return false
  const n = new globalThis.Notification(title, { body, tag, icon: './icons/icon-192.png', badge: './icons/icon-192.png', data })
  if (onClick) n.onclick = () => { globalThis.focus?.(); onClick(data) }
  return true
}

/* VAPID 公钥：base64url → Uint8Array（PushManager 需要） */
export function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const base64url = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = globalThis.atob ? globalThis.atob(base64url) : Buffer.from(base64url, 'base64').toString('binary')
  return Uint8Array.from([...raw].map(ch => ch.charCodeAt(0)))
}

export async function getPushSubscription() {
  if (!('serviceWorker' in navigator)) return null
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

/* 订阅 Web Push：需要服务器下发的 VAPID 公钥 */
export async function subscribePush(vapidPublicKey) {
  if (!vapidPublicKey || !('serviceWorker' in navigator)) return null
  const reg = await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  if (existing) return existing
  return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) })
}

export async function unsubscribePush() {
  if (!('serviceWorker' in navigator)) return false
  const reg = await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  if (!existing) return false
  await existing.unsubscribe()
  return true
}
