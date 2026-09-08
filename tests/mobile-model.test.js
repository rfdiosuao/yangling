import { describe, it, expect } from 'vitest'
import { makeAnswer, makePlan, scorePose, DEFAULT_QUESTION, QUESTIONS, STATES } from '../src/mobile/model.js'

describe('mobile prototype question flow', () => {
  it('matches the supplied default example with three expandable sources', () => {
    const answer = makeAnswer(DEFAULT_QUESTION)
    expect(answer.lines).toHaveLength(3)
    expect(answer.sources).toHaveLength(3)
  })
  it('provides different answers for each suggested question', () => {
    expect(new Set(QUESTIONS.map(q => makeAnswer(q).title)).size).toBe(3)
  })
  it('does not present a matching answer for an unrelated query', () => {
    expect(makeAnswer('明天天气如何').unmatched).toBe(true)
    expect(makeAnswer('明天天气如何').sources).toEqual([])
  })
  it('routes urgent symptoms to help instead of exercise cards', () => {
    expect(makePlan('胸痛呼吸困难').urgent).toBe(true)
    expect(makePlan('胸痛呼吸困难').cards).toBeUndefined()
    expect(makeAnswer('突然胸痛').urgent).toBe(true)
  })
  it('adapts cards to the selected state', () => {
    expect(makePlan('没睡好').cards[0].subtitle).not.toBe(makePlan('肩颈紧').cards[0].subtitle)
    expect(makePlan('肩颈紧').cards.map(c => c.type)).toEqual(['cup','move','breath'])
  })
  it('fills the home state grid with six useful choices', () => {
    expect(STATES).toEqual(['没睡好', '肩颈紧', '最近很累', '压力大', '胃口差', '心里烦'])
  })
})

describe('camera score feedback', () => {
  const frame = () => {
    const points = Array.from({ length:33 }, () => ({x:0,y:0,visibility:1}))
    for (const [id,x,y] of [[11,40,40],[12,60,40],[13,40,20],[14,60,20],[15,40,0],[16,60,0],[23,40,80],[24,60,80]]) points[id]={x,y,visibility:1}
    return points
  }
  it('returns no score when the user is missing or joints are obscured', () => {
    expect(scorePose(null,0)).toBeNull()
    const points=frame(); points[15].visibility=.1; points[16].visibility=.1
    expect(scorePose(points,0)).toBeNull()
  })
  it('keeps scoring when one side is partly obscured', () => {
    const points = frame(); points[12].visibility = .1
    const result = scorePose(points, 0)
    expect(result?.partial).toBe(true)
    expect(result?.score).toBeGreaterThan(0)
  })
  it('uses actual wrist heights to differentiate raised and lowered arms', () => {
    const points=frame()
    const raised=scorePose(points,0)
    points[15].y=70; points[16].y=70
    const lowered=scorePose(points,0)
    expect(raised.armGood).toBe(true)
    expect(lowered.armGood).toBe(false)
    expect(raised.score).toBeGreaterThan(lowered.score)
  })
  it('uses elbow alignment for the second exercise', () => {
    const points=frame(); points[13].y=40; points[14].y=40
    expect(scorePose(points,1).armGood).toBe(true)
    points[13].y=80
    expect(scorePose(points,1).armGood).toBe(false)
  })
})
