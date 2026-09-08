import { describe, it, expect, beforeAll } from 'vitest'
import { tokenizeCN, createIndex, retrieve } from '../src/core/agent/retriever.js'
import { buildEngineCorpus, buildDocsCorpus, getRag, SOURCES } from '../src/core/agent/rag.js'
import { tagCards, attachCites } from '../src/core/agent/tagger.js'
import { validateCites, validateIntervention } from '../src/core/contracts/validate.js'
import { answer } from '../src/core/agent/agent.js'

// 最小 sessionStorage mock(vitest node 环境无 DOM 存储)
const mem = new Map()
globalThis.sessionStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
  clear: () => mem.clear(),
}

describe('中文 tokenizer(单字 + 二元组)', () => {
  it('拆分汉字为单字与二元组,ASCII 词独立', () => {
    const tokens = tokenizeCN('白露润肺 tea')
    expect(tokens).toContain('白')
    expect(tokens).toContain('露')
    expect(tokens).toContain('白露')
    expect(tokens).toContain('露润')
    expect(tokens).toContain('tea')
  })

  it('空输入返回空数组', () => {
    expect(tokenizeCN('')).toEqual([])
    expect(tokenizeCN(null)).toEqual([])
  })
})

describe('RAG 语料构建与检索(双数据源)', () => {
  it('engine-kb 展平:每张卡片一条,带状态/体质/类型标签', () => {
    const corpus = buildEngineCorpus({ interventions: {}, fallback: { cards: [{ id: 'x', type: 'cup' }], summary: {} }, states: [], constitutions: [], solarTerms: [] })
    expect(corpus.length).toBe(1)
  })

  it('真实 knowledge:展平出多条,含 source 标记', () => {
    const rag = getRag()
    return rag.then((r) => {
      expect(r.docs.length).toBeGreaterThan(10)
      expect(r.docs.some((d) => d.source === SOURCES.ENGINE_KB)).toBe(true)
      expect(r.docs.some((d) => d.source === SOURCES.DOCS)).toBe(true)
      expect(r.docs.some((d) => d.source === SOURCES.PAPERS)).toBe(true)
    })
  })

  it('论文源命中:八段锦姿态评估查询 → 命中 papers 切片', async () => {
    const rag = await getRag()
    const hits = rag.retrieve('八段锦 姿态估计 动作评估 关键点', { topK: 6 })
    expect(hits.some((h) => h.source === SOURCES.PAPERS)).toBe(true)
  })

  it('中文查询命中:熬夜上火 → 百合莲子饮/内关穴条目', async () => {
    const rag = await getRag()
    const hits = rag.retrieve('熬夜上火嘴苦 阴虚', { topK: 6 })
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0].score).toBeGreaterThan(0)
    const all = hits.map((h) => h.title).join(' ')
    expect(all).toMatch(/百合|内关|4-7-8|呼吸/)
  })

  it('docs 源命中:白露 → docs:01', async () => {
    const rag = await getRag()
    const hits = rag.retrieve('白露 秋燥 滋阴', { topK: 5 })
    expect(hits.some((h) => h.id === 'docs:01')).toBe(true)
  })

  it('空查询返回空数组', async () => {
    const rag = await getRag()
    expect(rag.retrieve('  ')).toEqual([])
  })
})

describe('贴令牌与引用', () => {
  const cards = [
    { id: 'c1', type: 'cup', title: '一杯 · 百合莲子饮', timeSlot: '卯时' },
    { id: 'c2', type: 'breath', title: '一息 · 4-7-8 呼吸法', timeSlot: '亥时' },
  ]
  const stateJson = { inferred: { matchedState: 'aoye-shanghuo', constitutionId: 'yinxu', solarTermId: 'bailu' } }
  const hits = [
    { id: 'kb:熬夜上火:阴虚:白露:0', source: 'engine-kb', title: '一杯 · 百合莲子饮', text: '做法', score: 1, tags: ['熬夜上火', '阴虚', '白露', '一杯', '卯时'] },
    { id: 'docs:04', source: 'docs', title: '4-7-8 呼吸法', text: '呼吸法', score: 0.8, tags: ['呼吸', '助眠'] },
  ]

  it('tagCards:每卡带类型/时辰/依据标签', () => {
    const tagged = tagCards(cards, stateJson)
    expect(tagged[0].tags).toEqual(
      expect.arrayContaining([
        { k: '类型', v: '一杯' },
        { k: '时辰', v: '卯时' },
      ])
    )
    expect(tagged[1].tags.some((t) => t.k === '依据' && t.v.includes('aoye-shanghuo'))).toBe(true)
  })

  it('attachCites:citeIds 全部存在于 cites.id,按标签交集关联', () => {
    const { intervention } = attachCites({ schemaVersion: '1.0', cards, summary: {}, disclaimer: 'x' }, hits)
    const citeIdSet = new Set(intervention.cites.map((c) => c.id))
    for (const card of intervention.cards) {
      for (const id of card.citeIds) expect(citeIdSet.has(id)).toBe(true)
    }
    // cup 卡与百合条目标签交集 → 命中自身
    const cup = intervention.cards.find((c) => c.id === 'c1')
    expect(cup.citeIds).toContain('kb:熬夜上火:阴虚:白露:0')
    // 呼吸卡与 docs:04 标签交集(呼吸) → 命中
    const breath = intervention.cards.find((c) => c.id === 'c2')
    expect(breath.citeIds).toContain('docs:04')
  })
})

describe('契约扩展(向后兼容)', () => {
  it('validateCites:合法通过,缺字段/重复 id 报错', () => {
    expect(validateCites([{ id: 'a', source: 's', label: 'l' }]).ok).toBe(true)
    expect(validateCites(null).ok).toBe(true)
    expect(validateCites([{ id: 'a', source: 's' }]).ok).toBe(false)
    expect(validateCites([{ id: 'a' }, { id: 'a' }]).ok).toBe(false)
  })

  it('validateIntervention:无 cites/tags 的旧结构仍通过', () => {
    const old = { schemaVersion: '1.0', cards: [{ id: 'c1', type: 'cup' }], summary: { headline: 'h' }, disclaimer: 'd' }
    expect(validateIntervention(old).ok).toBe(true)
  })

  it('validateIntervention:citeIds 指向不存在的 id → 报错', () => {
    const bad = {
      schemaVersion: '1.0',
      cards: [{ id: 'c1', type: 'cup', citeIds: ['nope'] }],
      cites: [{ id: 'a', source: 's', label: 'l' }],
      summary: { headline: 'h' },
      disclaimer: 'd',
    }
    expect(validateIntervention(bad).ok).toBe(false)
  })

  it('validateIntervention:完整 tags+cites 结构通过', () => {
    const good = {
      schemaVersion: '1.0',
      cards: [{ id: 'c1', type: 'cup', tags: [{ k: '类型', v: '一杯' }], citeIds: ['a'] }],
      cites: [{ id: 'a', source: 's', label: 'l' }],
      summary: { headline: 'h' },
      disclaimer: 'd',
    }
    expect(validateIntervention(good).ok).toBe(true)
  })
})

describe('Agent 主链路', () => {
  beforeAll(() => mem.clear())

  it('输入熬夜状态 → 干预含 cards/tags/cites,契约通过,模式为 rules', async () => {
    const res = await answer('昨晚3点睡,今天嘴苦没精神', {})
    expect(res).toBeTruthy()
    expect(res.needInfo).toBeFalsy()
    expect(res.intervention.cards.length).toBeGreaterThan(0)
    expect(res.mode).toBe('rules')
    expect(res.intervention.cards[0].tags.length).toBeGreaterThan(0)
    expect(res.intervention.cites.length).toBeGreaterThan(0)
    expect(validateIntervention(res.intervention).ok).toBe(true)
    // 持久化与 CardPage 兼容
    const stored = JSON.parse(sessionStorage.getItem('yangling:lastIntervention'))
    expect(stored.cards.length).toBeGreaterThan(0)
  })

  it('红旗症状 → 直接就医提示,不出干预', async () => {
    const res = await answer('我今天胸口很痛', {})
    expect(res.redFlag).toBe(true)
    expect(res.intervention).toBeNull()
  })

  it('未识别输入 → needInfo 引导', async () => {
    const res = await answer('今天天气不错', {})
    expect(res.needInfo).toBe(true)
  })
})
