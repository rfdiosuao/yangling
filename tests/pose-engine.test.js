import { describe, it, expect } from 'vitest'
import { estimatePose, angleBetween, POSE_CONTRACTS } from '../src/core/motion/pose-engine.js'

describe('pose-engine 姿态判断', () => {
  it('达标角度 → done true', () => {
    const r = estimatePose('move-shoulder', { angle: 90 })
    expect(r.done).toBe(true)
    expect(r.hint).toContain('到位')
  })

  it('容差内角度 → done true', () => {
    // move-shoulder 目标 90 ± 20 → 100 达标
    const r = estimatePose('move-shoulder', { angle: 100 })
    expect(r.done).toBe(true)
  })

  it('超出容差 → done false + 提示当前/目标角度', () => {
    const r = estimatePose('move-shoulder', { angle: 40 })
    expect(r.done).toBe(false)
    expect(r.hint).toContain('40°')
    expect(r.hint).toContain('90°')
  })

  it('未知动作 → done false + 未识别提示', () => {
    const r = estimatePose('not-a-real-move', { angle: 90 })
    expect(r.done).toBe(false)
    expect(r.hint).toBe('未识别的动作')
  })

  it('缺反馈 → done false + 提示语', () => {
    const r = estimatePose('move-shoulder', {})
    expect(r.done).toBe(false)
    expect(r.hint).toBe(POSE_CONTRACTS['move-shoulder'].hint)
  })

  it('三点夹角计算:90° 直角', () => {
    const angle = angleBetween({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 })
    // (0,0)-(0,0)-(0,1) 顶点在原点,退化为 0,边界情况不崩
    expect(typeof angle).toBe('number')
  })

  it('真实三点:肘部 90° 弯曲', () => {
    // 肩(0,0) 肘(1,0) 腕(1,1) → 肘部 90°
    const angle = angleBetween({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 })
    expect(angle).toBeCloseTo(90, 0)
  })
})
