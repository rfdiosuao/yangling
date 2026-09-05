import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  emptyProfile, loadProfile, saveProfile, addPlan, checkIn,
  recomputeStreak, clearProfile,
} from '../src/core/profile/store.js'

// localStorage mock(测试环境无浏览器 API)
class MemoryStorage {
  constructor() { this._data = new Map() }
  getItem(k) { return this._data.has(k) ? this._data.get(k) : null }
  setItem(k, v) { this._data.set(k, String(v)) }
  removeItem(k) { this._data.delete(k) }
  clear() { this._data.clear() }
}
const store = new MemoryStorage()
Object.defineProperty(globalThis, 'localStorage', {
  value: store,
  writable: true,
  configurable: true,
})

describe('画像存储', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it('空 localStorage → 返回空画像', () => {
    const p = loadProfile()
    expect(p.profileId).toMatch(/^local-anon-/)
    expect(p.checkins).toEqual([])
  })

  it('addPlan 记录方案生成 + 体质标签', () => {
    let p = loadProfile()
    p = addPlan(p, 'aoye-shanghuo', ['cup-1'], { constitution: 'yinxu' })
    expect(p.plans.length).toBe(1)
    expect(p.baseline.constitution).toBe('yinxu')
    expect(p.tags.constitutions[0].name).toBe('yinxu')
  })

  it('checkIn 当天只记一次,重复打卡不重复计数', () => {
    let p = loadProfile()
    p = checkIn(p, 'aoye-shanghuo', ['cup-1'], { 'cup-1': true })
    p = checkIn(p, 'aoye-shanghuo', ['cup-1'], { 'cup-1': true })
    expect(p.checkins.length).toBe(1)
    expect(p.calendar.streak.current).toBe(1)
  })

  it('跨天打卡 → streak 累加', () => {
    let p = loadProfile()
    // 今天
    p = checkIn(p, 'a', ['c1'])
    // 手动造一条昨天的记录
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    p.checkins.push({
      id: 'checkin-old',
      date: yesterday.toISOString().slice(0, 10),
      capturedAt: yesterday.toISOString(),
      stateRef: 'a',
      cards: ['c1'],
      completions: {},
    })
    p = saveProfile(p)
    recomputeStreak(p)
    expect(p.calendar.streak.current).toBe(2)
  })

  it('中断打卡 → streak 重置为当天/0', () => {
    let p = loadProfile()
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    p.checkins.push({
      id: 'c-old',
      date: threeDaysAgo.toISOString().slice(0, 10),
      capturedAt: threeDaysAgo.toISOString(),
      stateRef: 'a',
      cards: ['c1'],
      completions: {},
    })
    p = saveProfile(p)
    recomputeStreak(p)
    // 没有连续到今天 → current 0
    expect(p.calendar.streak.current).toBe(0)
  })

  it('损坏的 localStorage → 恢复为空画像不崩', () => {
    localStorage.setItem('yangling:profile', '{bad json')
    const p = loadProfile()
    expect(p.checkins).toEqual([])
  })

  it('clearProfile 清空数据', () => {
    let p = loadProfile()
    p = checkIn(p, 'a', ['c1'])
    expect(p.checkins.length).toBe(1)
    const fresh = clearProfile()
    expect(fresh.checkins).toEqual([])
    expect(loadProfile().checkins).toEqual([])
  })
})
