/**
 * Agent 编排器(主链路)
 * 用户文本 → { state, intervention{cards,tags,cites}, mode }
 * 原则:engine 的 cards 永不改动;RAG 只补依据与 cites;LLM 只润色表达(可选)。
 * 失败路径全部降级:LLM 失败→规则;RAG 失败→空引用;抽取失败→needInfo。
 */
import { extractState, getLlmMode } from '../llm/client.js'
import { runEngine } from '../engine/index.js'
import { checkRisk } from '../safety/index.js'
import { validateIntervention } from '../contracts/validate.js'
import { getRag } from './rag.js'
import { buildContext, appendTurn } from './memory.js'
import { tagCards, attachCites } from './tagger.js'
import { isLlmEnabled, refineWithLlm } from './provider.js'

const STORAGE_STATE = 'yangling:lastState'
const STORAGE_INTERVENTION = 'yangling:lastIntervention'

/** 组装检索查询词:原文 + 推理标签 + 体质 + 状态 + 节气 */
function buildQuery(userText, stateJson) {
  const inf = stateJson?.inferred || {}
  return [
    userText,
    inf.matchedState,
    inf.constitutionId,
    inf.solarTermId,
    ...(inf.tags || []),
  ].filter(Boolean).join(' ')
}

export async function answer(userText, opts = {}) {
  // 1. 安全门禁(红旗 → 就医提示,与 ChatPage 分支一致)
  const risk = checkRisk(userText)
  if (risk.level === 'red_flag') {
    return { state: null, mode: 'rules', risk, intervention: null, redFlag: true }
  }

  // 2. 状态抽取(契约不变;未识别 → needInfo 引导)
  const stateJson = await extractState(userText, opts)
  if (!stateJson.inferred?.matchedState) {
    return { state: stateJson, mode: 'rules', risk: stateJson.risk, intervention: null, needInfo: true }
  }

  // 3. 规则引擎(契约不变;引擎内部已有安全门禁)
  const base = runEngine(stateJson)
  if (!base.cards.length && base.summary?.headline === '请立即就医') {
    return { state: stateJson, mode: 'rules', risk: stateJson.risk, intervention: null, redFlag: true }
  }

  // 4. RAG 检索(双源;失败 → 空 hits,不阻塞)
  let hits = []
  try {
    const rag = await getRag()
    hits = rag.retrieve(buildQuery(userText, stateJson), { topK: 6 })
  } catch (e) {
    console.warn('[yangling] RAG 检索失败,降级为空引用:', e)
  }

  // 5. 记忆上下文(画像 + 近期对话)
  const ctx = buildContext()

  // 6. LLM 可选润色(仅配置了 key 的在线模式;失败 → 规则输出)
  let result = base
  let mode = 'rules'
  if (isLlmEnabled()) {
    const refined = await refineWithLlm(base, hits, ctx)
    if (refined && validateIntervention(refined).ok) {
      result = refined
      mode = 'llm'
    }
  }

  // 7. 贴令牌 + 可溯源引用
  const { intervention, cites } = attachCites({ ...result, cards: tagCards(result.cards, stateJson) }, hits)

  // 8. 持久化(与现有 ChatPage/CardPage 相同的 key,零改动可读)
  sessionStorage.setItem(STORAGE_STATE, JSON.stringify(stateJson))
  sessionStorage.setItem(STORAGE_INTERVENTION, JSON.stringify(intervention))
  appendTurn('user', userText)
  appendTurn('bot', intervention.summary?.oneLine || '')

  return { state: stateJson, intervention, mode, cites, risk: stateJson.risk }
}
