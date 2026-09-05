import { describe, it, expect } from 'vitest'
import { runEngine, matchState, knowledge } from '../src/core/engine/index.js'
import { checkRisk } from '../src/core/safety/index.js'
import { validateState, validateIntervention } from '../src/core/contracts/validate.js'

describe('规则引擎', () => {
  it('精确命中:熬夜上火 × 阴虚 → 有卡片', () => {
    const result = runEngine({
      rawText: '昨晚熬夜,嘴苦,上火',
      userState: { body: [{ symptom: '口苦' }] },
      inferred: { solarTermId: 'bailu', constitutionId: 'yinxu', matchedState: 'aoye-shanghuo', hour: 'chenshi' },
    })
    expect(result.cards.length).toBeGreaterThan(0)
    expect(result.cards[0].type).toBe('cup')
  })

  it('状态通用 fallback:熬夜上火 × 平和质 → 有方案', () => {
    const result = runEngine({
      rawText: '熬夜了',
      userState: {},
      inferred: { solarTermId: 'bailu', constitutionId: 'pinghe', matchedState: 'aoye-shanghuo', hour: 'chenshi' },
    })
    expect(result.cards.length).toBeGreaterThan(0)
  })

  it('未知状态 → 全局 fallback,不崩', () => {
    const result = runEngine({
      rawText: '今天心情一般',
      userState: {},
      inferred: { solarTermId: 'bailu', constitutionId: 'pinghe', matchedState: null, hour: 'chenshi' },
    })
    expect(result.cards.length).toBeGreaterThan(0)
    expect(result.cards[0].type).toBe('cup')
  })

  it('缺失体质 → 默认平和质', () => {
    const result = runEngine({
      rawText: '熬夜',
      userState: {},
      inferred: { solarTermId: 'bailu', matchedState: 'aoye-shanghuo' },
    })
    expect(result.context.constitution).toBe('pinghe')
  })

  it('非法枚举体质 → 校验报错但引擎兜底', () => {
    const state = {
      rawText: '熬夜',
      userState: {},
      inferred: { solarTermId: 'bailu', constitutionId: 'not-a-real-type', matchedState: 'aoye-shanghuo' },
    }
    const check = validateState(state)
    expect(check.ok).toBe(false)
    expect(check.errors.some((e) => e.includes('constitutionId'))).toBe(true)
    const result = runEngine(state)
    expect(result.cards.length).toBeGreaterThan(0)
  })

  it('红旗症状(胸痛) → 不生成干预,只出就医提示', () => {
    const risk = checkRisk('我今天胸口痛,很难受')
    expect(risk.level).toBe('red_flag')
    const result = runEngine({
      rawText: '我今天胸口痛,很难受',
      userState: {},
      inferred: null,
      risk,
    })
    expect(result.cards.length).toBe(0)
    expect(result.safety.level).toBe('red_flag')
    expect(result.summary.headline).toContain('就医')
  })

  it('红旗症状(呼吸困难) → 拦截', () => {
    const risk = checkRisk('我奶奶呼吸困难,喘不上气')
    expect(risk.level).toBe('red_flag')
    const result = runEngine({ rawText: '我奶奶呼吸困难', userState: {}, inferred: null, risk })
    expect(result.cards.length).toBe(0)
  })

  it('特殊人群(怀孕) → 提示谨慎,仍可给一般建议', () => {
    const risk = checkRisk('我怀孕了,能按这个穴位吗')
    expect(risk.level).toBe('special')
    const result = runEngine({
      rawText: '我怀孕了,能按这个穴位吗',
      userState: {},
      inferred: { solarTermId: 'bailu', constitutionId: 'pinghe', matchedState: null },
      risk,
    })
    expect(result.safety.level).toBe('special')
  })
})

describe('契约校验', () => {
  it('intervention 校验:缺少 disclaimer 报错', () => {
    const bad = { schemaVersion: '1.0', cards: [{ id: 'x', type: 'cup' }], summary: {} }
    expect(validateIntervention(bad).ok).toBe(false)
  })

  it('intervention 校验:合法通过', () => {
    const good = {
      schemaVersion: '1.0',
      cards: [{ id: 'c1', type: 'cup', title: 'x' }],
      summary: { headline: 'h', oneLine: 'o' },
      disclaimer: '生活方式建议',
    }
    expect(validateIntervention(good).ok).toBe(true)
  })
})
