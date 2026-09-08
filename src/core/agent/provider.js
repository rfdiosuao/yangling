/**
 * LLM 可选层(Agent 的"可选增强")
 * 有 key → live 润色 summary/reason 表达;无 key → 纯规则 + RAG,不阻塞。
 * 硬性红线:只润色表达,禁止增删卡片或改动医学事实;输出经契约校验。
 */
const KEY = 'yangling:llm'

export function configureProvider({ name, apiKey, baseUrl, model } = {}) {
  const cfg = { name, apiKey, baseUrl, model }
  try { localStorage.setItem(KEY, JSON.stringify(cfg)) } catch { /* noop */ }
  return cfg
}

export function getProvider() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function isLlmEnabled() {
  const p = getProvider()
  return !!(p && p.apiKey)
}

export function clearProvider() {
  try { localStorage.removeItem(KEY) } catch { /* noop */ }
}

/** OpenAI 兼容 chat completion(DeepSeek/MiniMax/StepFun 均兼容) */
async function openaiCompatibleChat(provider, messages, { timeoutMs = 15000, signal } = {}) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  const merged = signal ? AbortSignal.any([ctrl.signal, signal]) : ctrl.signal
  try {
    const res = await fetch(`${String(provider.baseUrl || '').replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${provider.apiKey}` },
      body: JSON.stringify({
        model: provider.model || 'deepseek-chat',
        messages,
        temperature: 0.4,
        max_tokens: 1200,
      }),
      signal: merged,
    })
    if (!res.ok) throw new Error(`LLM HTTP ${res.status}`)
    const data = await res.json()
    return data.choices?.[0]?.message?.content || ''
  } finally {
    clearTimeout(timer)
  }
}

function parseJsonLoose(text) {
  try { return JSON.parse(text) } catch { /* fallthrough */ }
  const m = String(text).match(/\{[\s\S]*\}/)
  if (m) {
    try { return JSON.parse(m[0]) } catch { /* fallthrough */ }
  }
  return null
}

/**
 * 润色 summary 与 cards[].reason 的表达
 * 返回 null → 调用方走规则组装(不阻塞主链路)
 */
export async function refineWithLlm(intervention, hits = [], ctx = {}, opts = {}) {
  const provider = opts.provider || getProvider()
  if (!provider?.apiKey) return null

  const system = [
    '你是"养令"的中医养生文案编辑,负责把方案表达得更口语化、更有人情味。',
    '硬性红线:1)禁止增删/改动卡片(cards)与任何医学事实(食材、穴位、方法、理由);2)禁止新增诊断或疗效承诺;3)只允许润色 summary.headline / summary.oneLine / summary.constitutionTip 与每张卡的 reason。',
    '必须输出合法 JSON,结构:{ summary: { headline, oneLine, constitutionTip }, cards: [{ id, reason }] },id 必须与输入一致。',
  ].join('\n')

  const user = [
    `【用户画像】${ctx.profileText || '暂无'}`,
    `【近期对话】${ctx.historyText || '暂无'}`,
    `【检索依据】${(hits || []).slice(0, 5).map((h, i) => `[${i + 1}] ${h.title}:${(h.text || '').slice(0, 80)}`).join('\n') || '无'}`,
    `【当前方案 JSON】${JSON.stringify(intervention)}`,
    '请润色 summary 三个字段和每张卡的 reason,输出合法 JSON。',
  ].join('\n')

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const text = await openaiCompatibleChat(provider, [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ], opts)
      const out = parseJsonLoose(text)
      if (!out) throw new Error('JSON 解析失败')
      const cards = (intervention.cards || []).map((c) => {
        const patched = (out.cards || []).find((x) => x.id === c.id)
        return patched?.reason ? { ...c, reason: String(patched.reason).slice(0, 60) } : c
      })
      return {
        ...intervention,
        cards,
        summary: {
          headline: String(out.summary?.headline || intervention.summary?.headline || '').slice(0, 40),
          oneLine: String(out.summary?.oneLine || intervention.summary?.oneLine || '').slice(0, 60),
          constitutionTip: String(
            out.summary?.constitutionTip ?? intervention.summary?.constitutionTip ?? ''
          ).slice(0, 60),
        },
      }
    } catch (e) {
      if (attempt === 1) return null
    }
  }
  return null
}
