import { describe, it, expect } from 'vitest'
import { extractState } from '../src/core/llm/client.js'
import { runEngine } from '../src/core/engine/index.js'
import { addPlan, checkIn, loadProfile, recomputeStreak } from '../src/core/profile/store.js'

class MemoryStorage {
  constructor() { this._data = new Map() }
  getItem(k) { return this._data.has(k) ? this._data.get(k) : null }
  setItem(k, v) { this._data.set(k, String(v)) }
  removeItem(k) { this._data.delete(k) }
  clear() { this._data.clear() }
}
Object.defineProperty(globalThis, 'localStorage', {
  value: new MemoryStorage(),
  writable: true,
  configurable: true,
})

describe('demo 主链路 smoke', () => {
  it('正常输入:识别 → 引擎 → 打卡 → 日历', async () => {
    // 1. 说状态(关键词识别)
    const state = await extractState('昨晚3点睡,今天嘴苦,上火')
    expect(state.inferred.matchedState).toBe('aoye-shanghuo')
    expect(state.inferred.constitutionId).toBe('yinxu')

    // 2. 引擎生成时序卡
    const intervention = runEngine(state)
    expect(intervention.cards.length).toBeGreaterThan(0)
    expect(intervention.context.matchedState).toBe('aoye-shanghuo')
    expect(intervention.safety.level).toBe('ok')

    // 3. 记录方案 + 打卡
    let profile = loadProfile()
    profile = addPlan(profile, intervention.context.matchedState, intervention.cards.map((c) => c.id), {
      constitution: intervention.context.constitution,
    })
    profile = checkIn(profile, intervention.context.matchedState, intervention.cards.map((c) => c.id), {})
    recomputeStreak(profile)
    expect(profile.plans.length).toBe(1)
    expect(profile.checkins.length).toBe(1)
    expect(profile.calendar.streak.current).toBe(1)
    // 体质标签已更新(自我描述标签)
    expect(profile.tags.constitutions[0].name).toBe('yinxu')
  })

  it('未知输入:matchedState null,不硬出方案', async () => {
    const state = await extractState('今天天气不错')
    // 契约:未知输入 inferred 为 null(等待补充)
    expect(state.inferred).toBeNull()
    // 引擎对未知状态走 fallback(通用建议)
    const intervention = runEngine(state)
    expect(intervention.cards.length).toBeGreaterThan(0)
  })

  it('红旗输入:只就医提示,不生成干预', async () => {
    const state = await extractState('我胸口痛,喘不上气')
    expect(state.risk.level).toBe('red_flag')
    const intervention = runEngine(state)
    expect(intervention.cards.length).toBe(0)
    expect(intervention.safety.action).toBe('seek_medical')
  })

  it('特殊人群:有提示,仍可给一般建议', async () => {
    const state = await extractState('我怀孕了,最近总觉得累')
    expect(state.risk.level).toBe('special')
    const intervention = runEngine(state)
    expect(intervention.safety.level).toBe('special')
  })
})
