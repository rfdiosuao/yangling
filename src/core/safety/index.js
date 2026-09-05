/**
 * 医疗安全层
 * 红旗症状识别 + 特殊人群提示 + 风险等级输出。
 * 原则:高风险情况只返回就医/专业咨询提示,不生成具体养生干预。
 */

// 红旗症状:命中任一 → 直接就医提示,不生成干预
export const RED_FLAG_KEYWORDS = [
  '胸痛', '胸口痛', '心口痛', '胸闷', '呼吸困难', '喘不上气', '意识不清', '昏迷', '晕倒',
  '持续高热', '高烧不退', '严重头晕', '天旋地转', '明显出血', '大量出血',
  '吐血', '便血', '剧烈腹痛', '突然瘫痪', '口角歪斜', '言语不清', '肢体无力',
]

// 特殊人群关键词:命中 → 提示谨慎/咨询专业
export const SPECIAL_POPULATION_KEYWORDS = [
  '怀孕', '孕期', '孕妇', '哺乳', '儿童', '小孩', '老人', '高龄',
  '糖尿病', '高血压', '心脏病', '肾病', '肝病', '肿瘤', '癌症',
  '在吃药', '服药', '用药', '过敏', '正在吃', '慢性病',
]

const RISK_TEXT = {
  red_flag: '您描述的情况可能比较紧急,请立即就医或拨打急救电话,不要依赖养生建议。',
  special: '您属于需要特别关注的人群,这些建议仅为一般生活方式参考,请在医生或专业人士指导下进行。',
  ok: '以下为生活方式建议,不替代专业诊疗。如有不适请及时就医。',
}

/**
 * 检查输入文本中的风险信号
 * @param {string} rawText 用户原始输入
 * @returns {{ level: 'red_flag'|'special'|'ok', matched: string[], disclaimer: string }}
 */
export function checkRisk(rawText) {
  const text = (rawText || '').toLowerCase()

  const redMatched = RED_FLAG_KEYWORDS.filter((k) => text.includes(k))
  if (redMatched.length) {
    return {
      level: 'red_flag',
      matched: redMatched,
      action: 'seek_medical',
      disclaimer: RISK_TEXT.red_flag,
    }
  }

  const specialMatched = SPECIAL_POPULATION_KEYWORDS.filter((k) => text.includes(k))
  if (specialMatched.length) {
    return {
      level: 'special',
      matched: specialMatched,
      action: 'caution',
      disclaimer: RISK_TEXT.special,
    }
  }

  return { level: 'ok', matched: [], action: 'normal', disclaimer: RISK_TEXT.ok }
}

/**
 * 给干预结果附加安全层
 * @param {object} intervention 规则引擎输出
 * @param {object} risk checkRisk 的返回
 * @returns 带 safety 字段的干预对象
 */
export function attachSafety(intervention, risk) {
  return {
    ...intervention,
    safety: {
      level: risk.level,
      matched: risk.matched,
      action: risk.action,
      disclaimer: risk.disclaimer || intervention.disclaimer,
    },
  }
}
