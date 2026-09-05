import knowledge from './knowledge.json'
import { attachSafety, checkRisk } from '../safety/index.js'
import { validateIntervention, validateState } from '../contracts/validate.js'

/**
 * M2 时令养生引擎(纯函数,无 React 依赖)
 * 输入:Schema S(状态 JSON)→ 输出:Schema I(干预 JSON)
 * 规则兜底 + LLM 表达(见 llm/client.js),医学可审、不会胡说。
 *
 * 查询路径:interventions[stateId][constitutionId][solarTermId]
 * 兜底链:精确匹配 → 该状态通用(constitution=*)→ 该体质通用(state=*)→ fallback
 */
export function matchState(state) {
  const inferred = state?.inferred || {}
  const solarTermId = inferred.solarTermId || 'bailu' // 缺省白露(当前节气)
  const constitutionId = inferred.constitutionId || 'pinghe'
  const matchedState = inferred.matchedState || null

  const interventions = knowledge.interventions

  // 1. 精确:state × constitution × solarTerm
  const exact =
    matchedState && interventions[matchedState]?.[constitutionId]?.[solarTermId]

  // 2. 该状态通用节气:state × constitution × *
  const stateConstitution =
    matchedState && interventions[matchedState]?.[constitutionId]?.['*']

  // 3. 该体质通用状态:* × constitution × *
  const constitutionFallback = interventions['*']?.[constitutionId]?.['*']

  // 4. 全局兜底
  const picked =
    exact || stateConstitution || constitutionFallback || knowledge.fallback

  const now = new Date()
  return {
    schemaVersion: '1.0',
    generatedAt: now.toISOString(),
    context: {
      solarTerm: solarTermId,
      hour: inferred.hour || null,
      constitution: constitutionId,
      constitutionLabel: constitutionLabel(constitutionId),
      matchedState: matchedState,
    },
    cards: picked.cards || [],
    summary: picked.summary || knowledge.fallback.summary,
    disclaimer: '本方案为生活方式建议,不替代专业诊疗。如有不适请就医。',
  }
}

/** 体质中文表述(用"可能倾向",避免确诊式表述) */
const CONSTITUTION_LABELS = {
  pinghe: '平和质(可能倾向)',
  qixu: '气虚质(可能倾向)',
  yangxu: '阳虚质(可能倾向)',
  yinxu: '阴虚质(可能倾向)',
  tanshi: '痰湿质(可能倾向)',
  shire: '湿热质(可能倾向)',
  xueyu: '血瘀质(可能倾向)',
  qiyu: '气郁质(可能倾向)',
  tebing: '特禀质(可能倾向)',
}
export function constitutionLabel(id) {
  return CONSTITUTION_LABELS[id] || '体质未确定'
}

/** 归一化:从用户状态推断体质/状态(骨架版,LLM 版见 llm/) */
export function inferFromUserState(userState) {
  const bodyText = JSON.stringify(userState?.body || []).toLowerCase()
  const hasHeat = ['口苦', '上火', '咽干', '嘴苦'].some((k) => bodyText.includes(k))
  const hasCold = ['怕冷', '手脚冰凉', '畏寒'].some((k) => bodyText.includes(k))

  return {
    solarTermId: 'bailu',
    constitutionId: hasCold ? 'yangxu' : hasHeat ? 'yinxu' : 'pinghe',
    matchedState: hasCold ? 'shoujiao-bingliang' : hasHeat ? 'aoye-shanghuo' : null,
    hour: 'chenshi',
  }
}

/** 引擎主入口:状态 JSON → 干预 JSON(含安全门禁 + 校验) */
export function runEngine(stateJson) {
  // 契约校验(不静默)
  const check = validateState(stateJson)
  if (!check.ok) {
    console.warn('[yangling] state 校验失败:', check.errors)
  }

  // 安全门禁:红旗症状直接返回就医提示,不生成干预
  const rawText = stateJson?.rawText || ''
  const risk = stateJson?.risk || checkRisk(rawText)
  if (risk.level === 'red_flag') {
    return attachSafety({
      schemaVersion: '1.0',
      generatedAt: new Date().toISOString(),
      context: { matchedState: null, constitution: null, constitutionLabel: null, solarTerm: null, hour: null },
      cards: [],
      summary: { headline: '请立即就医', oneLine: risk.disclaimer, constitutionTip: '' },
      disclaimer: risk.disclaimer,
    }, risk)
  }

  // 若 M1 未做推理,先用规则补全 inferred
  const fullState = {
    ...stateJson,
    inferred: stateJson.inferred || inferFromUserState(stateJson.userState),
  }

  const intervention = matchState(fullState)
  const withSafety = attachSafety(intervention, risk)

  const ivCheck = validateIntervention(withSafety)
  if (!ivCheck.ok) {
    console.warn('[yangling] intervention 校验失败:', ivCheck.errors)
  }
  return withSafety
}

export { knowledge }
