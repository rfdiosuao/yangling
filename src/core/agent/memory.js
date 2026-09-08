/**
 * Agent 记忆:对话历史(sessionStorage) + 用户画像注入(复用 profile/store,只读)
 * 注入用途:规则层用 baseline 校准文案口径;LLM 层作为 prompt 上下文。
 */
import { loadProfile } from '../profile/store.js'

const HISTORY_KEY = 'yangling:chatHistory'
const MAX_TURNS = 12

export function loadRecentHistory(n = 10) {
  try {
    const raw = sessionStorage.getItem(HISTORY_KEY)
    const turns = raw ? JSON.parse(raw) : []
    return Array.isArray(turns) ? turns.slice(-n) : []
  } catch {
    return []
  }
}

export function appendTurn(role, text) {
  try {
    const turns = loadRecentHistory(MAX_TURNS)
    turns.push({ role, text, ts: new Date().toISOString() })
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(turns.slice(-MAX_TURNS)))
  } catch { /* 存储异常不影响主链路 */ }
}

export function clearHistory() {
  try { sessionStorage.removeItem(HISTORY_KEY) } catch { /* noop */ }
}

/** 画像 → 上下文文本(只读 profile,不新增存储契约) */
export function buildProfileContext(profile = loadProfile()) {
  const parts = []
  if (profile.baseline?.constitution) {
    parts.push(`体质倾向:${profile.baseline.constitution}`)
  }
  const states = (profile.tags?.states || []).slice(-3)
  if (states.length) {
    parts.push(`近期状态:${states.map((s) => `${s.name}(${s.count}次)`).join('、')}`)
  }
  const lastPlan = profile.plans?.slice(-1)[0]
  if (lastPlan?.cards?.length) {
    parts.push(`上次方案:${lastPlan.cards.slice(0, 3).join('、')}`)
  }
  return {
    profileText: parts.join(';') || '暂无画像数据',
    historyText: loadRecentHistory(6)
      .map((t) => `${t.role === 'user' ? '用户' : '养令'}:${t.text}`)
      .join('\n') || '暂无近期对话',
    baseline: profile.baseline?.constitution || null,
    recentStates: (profile.tags?.states || []).map((s) => s.name),
  }
}

/** 组合上下文(供 LLM prompt 或规则组装) */
export function buildContext() {
  const ctx = buildProfileContext()
  return {
    ...ctx,
    combined: `【画像】${ctx.profileText}\n【近期对话】${ctx.historyText}`,
  }
}
