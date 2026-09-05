/**
 * M1 状态采集 & M2 个性化表达的 LLM 层
 * 模型:StepFun / MiniMax / 百川(赛事 token,可降级)
 * 原则:LLM 只做"表达与抽取",不做"医学决策"——决策由规则引擎兜底。
 * 失败策略:LLM 不可用 → 返回 null,调用方走规则兜底/原文透传。
 */
import { checkRisk } from '../safety/index.js'

export const LLM_MODE = {
  MOCK: 'mock',   // 骨架开发期:不调真模型
  LIVE: 'live',   // 接真模型
}

// 当前模式:骨架期用 mock,接 token 后改 live
let mode = LLM_MODE.MOCK

export function setLlmMode(m) {
  mode = m
}

export function getLlmMode() {
  return mode
}

/**
 * 基于关键词识别状态(本地 mock 抽取)
 * 不做医疗判断,只是把明显的状态词映射到 demo 场景;未知输入返回 matchedState: null。
 */
const KEYWORD_MAP = [
  {
    id: 'aoye-shanghuo',
    keywords: ['熬夜', '嘴苦', '口苦', '上火', '没精神', '睡眠不足', '口干'],
    constitutionId: 'yinxu',
  },
  {
    id: 'shoujiao-bingliang',
    keywords: ['手脚冰凉', '怕冷', '畏寒', '手脚冷', '手脚发凉', '容易冷'],
    constitutionId: 'yangxu',
  },
  {
    id: 'jiuzuo-jianjing',
    keywords: ['久坐', '肩颈', '肩膀酸', '脖子疼', '颈椎', '肩颈酸', '肩膀硬'],
    constitutionId: 'pinghe',
  },
  {
    id: 'shimian-qian',
    keywords: ['失眠', '睡不着', '睡眠浅', '多梦', '早醒', '入睡难'],
    constitutionId: 'pinghe',
  },
]

export function recognizeByKeywords(rawText) {
  const text = (rawText || '').toLowerCase()
  const matched = KEYWORD_MAP.find((s) => s.keywords.some((k) => text.includes(k)))
  return matched || null
}

function buildExtraction(rawText, demo) {
  const base = {
    schemaVersion: '1.0',
    capturedAt: new Date().toISOString(),
    rawText,
    userState: {
      sleep: { quality: null, hours: null, bedtime: null },
      emotion: [],
      diet: [],
      body: [],
      schedule: [],
    },
    inferred: null,
    profile: { profileId: 'local-anon-001', constitutionBaseline: null },
  }

  // 按 demo 场景填模拟结构化数据(演示友好)
  if (demo?.id === 'aoye-shanghuo') {
    base.userState = {
      sleep: { quality: 'poor', hours: 3, bedtime: '03:00', notes: '晚睡' },
      emotion: ['irritated', 'tired'],
      diet: [{ item: '咖啡', amount: '2杯', time: '上午' }],
      body: [{ symptom: '口苦', severity: 2, location: '口' }],
      schedule: [{ activity: '会议', time: '下午', duration: '3小时', cognitiveLoad: 'high' }],
    }
    base.inferred = {
      solarTermId: 'bailu',
      constitutionId: demo.constitutionId,
      matchedState: demo.id,
      hour: 'chenshi',
      tags: ['熬夜', '上火', '阴虚'],
    }
  } else if (demo?.id === 'shoujiao-bingliang') {
    base.userState = {
      sleep: { quality: 'fair', hours: 7, bedtime: '23:00' },
      emotion: ['calm'],
      diet: [],
      body: [{ symptom: '手脚冰凉', severity: 2, location: '四肢' }],
      schedule: [],
    }
    base.inferred = {
      solarTermId: 'bailu',
      constitutionId: demo.constitutionId,
      matchedState: demo.id,
      hour: 'xushi',
      tags: ['怕冷', '阳虚'],
    }
  } else if (demo?.id === 'jiuzuo-jianjing') {
    base.userState = {
      sleep: { quality: 'fair', hours: 6.5, bedtime: '00:30' },
      emotion: ['tired'],
      diet: [],
      body: [{ symptom: '肩颈酸', severity: 2, location: '肩颈' }],
      schedule: [{ activity: '办公', time: '全天', duration: '8小时', cognitiveLoad: 'medium' }],
    }
    base.inferred = {
      solarTermId: 'bailu',
      constitutionId: demo.constitutionId,
      matchedState: demo.id,
      hour: 'chenshi',
      tags: ['久坐', '肩颈'],
    }
  } else if (demo?.id === 'shimian-qian') {
    base.userState = {
      sleep: { quality: 'poor', hours: 4, bedtime: '01:00' },
      emotion: ['anxious', 'tired'],
      diet: [],
      body: [{ symptom: '睡眠浅', severity: 2, location: '睡眠' }],
      schedule: [],
    }
    base.inferred = {
      solarTermId: 'bailu',
      constitutionId: demo.constitutionId,
      matchedState: demo.id,
      hour: 'haishi',
      tags: ['失眠', '浅睡'],
    }
  }
  return base
}

/**
 * M1 抽取:用户自然语言 → 结构化状态(部分抽取,推理交给 M2 规则)
 * - 先做风险检查(红旗/特殊人群)
 * - 再按关键词识别场景;识别不到 → matchedState: null(调用方引导补充)
 */
export async function extractState(rawText, opts = {}) {
  // 1. 风险检查
  const risk = checkRisk(rawText)
  if (risk.level !== 'ok') {
    return {
      schemaVersion: '1.0',
      capturedAt: new Date().toISOString(),
      rawText,
      userState: {},
      inferred: null,
      risk,
      profile: { profileId: 'local-anon-001', constitutionBaseline: null },
    }
  }

  // 2. 关键词识别(默认或指定 demo)
  const demo = opts.demo ? KEYWORD_MAP.find((s) => s.id === opts.demo) : recognizeByKeywords(rawText)
  const extraction = buildExtraction(rawText, demo)
  extraction.risk = risk
  return extraction
}

async function extractStateLive(rawText) {
  // TODO(接 token 后):调 StepFun/MiniMax/百川,固定 JSON schema 输出 userState 部分
  throw new Error('live LLM not yet wired; use mock mode')
}

/**
 * M2 个性化表达:干预 JSON → 更口语化的文案(可选增强层)
 * mock:直接返回原文案(规则兜底本身已可演示)。
 */
export async function personalizeIntervention(intervention, opts = {}) {
  if (mode === LLM_MODE.MOCK) return intervention
  throw new Error('live LLM not yet wired; use mock mode')
}
