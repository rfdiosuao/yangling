import { describe, expect, it } from 'vitest'
import {
  SOLAR_TERMS_2026,
  fmtDate,
  getSolarTerm,
  generateAlias,
  formatDuration,
  loadReminder,
  saveReminder,
  DEFAULT_REMINDER,
  loadTodaySeconds,
  addTodaySeconds,
  pickTemplate,
} from '../src/mobile/reminder.js'

/* 内存版 storage，模拟 localStorage */
function memStorage(initial = {}) {
  const map = new Map(Object.entries(initial))
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k),
  }
}

describe('独特别称 · 节气', () => {
  it('白露当天落在「白露」节气', () => {
    expect(getSolarTerm(new Date(2026, 8, 7))).toBe('白露')
  })
  it('节气边界：9 月 6 日还在处暑，9 月 7 日进入白露', () => {
    expect(getSolarTerm(new Date(2026, 8, 6))).toBe('处暑')
    expect(getSolarTerm(new Date(2026, 8, 7))).toBe('白露')
  })
  it('年内最早日期落到小寒', () => {
    expect(getSolarTerm(new Date(2026, 0, 5))).toBe('小寒')
  })
  it('超出节气表范围的日期回退为「顺时」', () => {
    expect(getSolarTerm(new Date(2027, 0, 1))).toBe('顺时')
  })
})

describe('独特别称 · 生成', () => {
  it('别称包含节气与五行，且当天随机后缀稳定', () => {
    const alias = generateAlias(new Date(2026, 8, 7), () => 0.42)
    expect(alias).toContain('白露')
    expect(alias).toContain('秋金')
    expect(alias).toContain('·')
  })
  it('不同随机种子可产出不同后缀', () => {
    const a = generateAlias(new Date(2026, 8, 7), () => 0.1)
    const b = generateAlias(new Date(2026, 8, 7), () => 0.9)
    expect(a).not.toBe(b)
  })
})

describe('使用时长 · 按日累计', () => {
  it('空存储时今日时长为 0', () => {
    expect(loadTodaySeconds(memStorage())).toBe(0)
  })
  it('addTodaySeconds 累加并写入当日 key，不影响其他日期', () => {
    const storage = memStorage()
    expect(addTodaySeconds(120, storage, new Date(2026, 8, 7))).toBe(120)
    expect(addTodaySeconds(90, storage, new Date(2026, 8, 7))).toBe(210)
    expect(loadTodaySeconds(storage, new Date(2026, 8, 7))).toBe(210)
    expect(loadTodaySeconds(storage, new Date(2026, 8, 8))).toBe(0)
  })
  it('非法存储内容回退为 0', () => {
    const storage = memStorage({ 'yangling:usage:v1:2026-09-07': 'abc' })
    expect(loadTodaySeconds(storage, new Date(2026, 8, 7))).toBe(0)
  })
})

describe('提醒设置 · 持久化', () => {
  it('默认提醒为关闭、间隔 45 分钟', () => {
    expect(loadReminder(memStorage())).toEqual(DEFAULT_REMINDER)
  })
  it('保存后读取返回合并结果', () => {
    const storage = memStorage()
    saveReminder({ enabled: true, intervalMin: 30 }, storage)
    expect(loadReminder(storage)).toEqual({ ...DEFAULT_REMINDER, enabled: true, intervalMin: 30 })
  })
})

describe('提醒文案模板', () => {
  it('督促系文案含别名、时长与动作建议', () => {
    const t = pickTemplate('阿令', 47, 'nudge')
    expect(t.title).toContain('阿令')
    expect(t.body).toContain('47 分钟')
    expect(t.body).toMatch(/一息|肩颈|温水/)
  })
  it('温情系文案不含恐吓表述', () => {
    const t = pickTemplate('阿令', 47, 'chill')
    expect(t.body).not.toMatch(/废|病|死|警告|危险/)
  })
})

describe('格式化', () => {
  it('formatDuration 显示分钟与小时', () => {
    expect(formatDuration(30)).toBe('30 秒')
    expect(formatDuration(47 * 60)).toBe('47 分钟')
    expect(formatDuration(3600 + 600)).toBe('1 小时 10 分钟')
  })
})

describe('节气数据完整性', () => {
  it('2026 年共 24 个节气且按日期有序', () => {
    expect(SOLAR_TERMS_2026).toHaveLength(24)
    const dates = SOLAR_TERMS_2026.map(([d]) => d)
    expect([...dates].sort()).toEqual(dates)
    expect(fmtDate(new Date(2026, 8, 7))).toBe('2026-09-07')
  })
})
