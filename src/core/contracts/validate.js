/**
 * 契约运行时校验
 * 统一 Schema S/I/P/K 的字段校验,防止静默 fallback 掩盖真实数据流错误。
 * 参考 docs/CONTRACTS.md v1.1
 */

export const CONSTITUTION_IDS = [
  'pinghe', 'qixu', 'yangxu', 'yinxu', 'tanshi', 'shire', 'xueyu', 'qiyu', 'tebing',
]
export const STATE_IDS = [
  'aoye-shanghuo', 'shoujiao-bingliang', 'jiuzuo-jianjing', 'shimian-qian', null,
]
export const CARD_TYPES = ['cup', 'move', 'breath']
export const HOUR_IDS = ['子时','丑时','寅时','卯时','辰时','巳时','午时','未时','申时','酉时','戌时','亥时']

/** 返回 { ok, errors[] } */
export function validateState(state) {
  const errors = []
  if (!state || typeof state !== 'object') return { ok: false, errors: ['state 必须为对象'] }
  if (!state.rawText && !state.userState) errors.push('state 缺少 rawText 或 userState')
  if (state.inferred !== null && typeof state.inferred !== 'object') {
    errors.push('inferred 必须为对象或 null')
  }
  const inf = state.inferred || {}
  if (inf.constitutionId && !CONSTITUTION_IDS.includes(inf.constitutionId)) {
    errors.push(`未知 constitutionId: ${inf.constitutionId}`)
  }
  if (inf.matchedState && !STATE_IDS.includes(inf.matchedState)) {
    errors.push(`未知 matchedState: ${inf.matchedState}`)
  }
  if (inf.hour && !HOUR_IDS.includes(inf.hour)) {
    errors.push(`未知 hour: ${inf.hour}`)
  }
  if (inf.solarTermId && typeof inf.solarTermId !== 'string') {
    errors.push('solarTermId 必须为字符串')
  }
  return { ok: errors.length === 0, errors }
}

/** 返回 { ok, errors[] } */
export function validateIntervention(intervention) {
  const errors = []
  if (!intervention || typeof intervention !== 'object') return { ok: false, errors: ['intervention 必须为对象'] }
  if (intervention.schemaVersion !== '1.0') errors.push(`schemaVersion 应为 1.0,实际 ${intervention.schemaVersion}`)
  if (!Array.isArray(intervention.cards)) errors.push('cards 必须为数组')
  for (const c of intervention.cards || []) {
    if (c.type && !CARD_TYPES.includes(c.type)) errors.push(`未知卡片类型: ${c.type}`)
    if (c.id == null) errors.push('卡片缺少 id')
  }
  if (!intervention.summary || typeof intervention.summary !== 'object') errors.push('缺少 summary')
  if (!intervention.disclaimer) errors.push('缺少 disclaimer')
  return { ok: errors.length === 0, errors }
}

/** 返回 { ok, errors[] } */
export function validateKnowledge(kb) {
  const errors = []
  if (!kb || typeof kb !== 'object') return { ok: false, errors: ['知识库必须为对象'] }
  if (kb.schemaVersion !== '1.0') errors.push('知识库 schemaVersion 应为 1.0')
  if (!kb.fallback?.cards?.length) errors.push('知识库缺少 fallback.cards')
  if (!kb.fallback?.summary) errors.push('知识库缺少 fallback.summary')
  return { ok: errors.length === 0, errors }
}
