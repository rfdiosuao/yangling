import { describe, it, expect } from 'vitest'
import {
  DEFAULT_CONFIG,
  DIALECTS,
  normalizeConfig,
  validateVideoUrl,
  findKnowledgeAnswer,
  findKnowledgeMatches,
  parseKnowledgeJson,
  parseKnowledgeMarkdown,
} from '../src/mobile/config.js'

describe('mobile app administration configuration', () => {
  it('ships editable LLM, knowledge and exercise video defaults', () => {
    expect(DEFAULT_CONFIG.llm.provider).toBeTruthy()
    expect(DEFAULT_CONFIG.llm.model).toBeTruthy()
    expect(DEFAULT_CONFIG.knowledge.length).toBeGreaterThan(0)
    expect(DEFAULT_CONFIG.courses.find(item => item.name === '八段锦')?.videoUrl).toMatch(/^https?:\/\//)
  })

  it('normalizes persisted partial data without losing required defaults', () => {
    const result = normalizeConfig({ llm: { model: 'custom-model' }, courses: [{ name: '八段锦', videoUrl: 'https://example.com/lesson' }] })
    expect(result.llm.model).toBe('custom-model')
    expect(result.llm.provider).toBe(DEFAULT_CONFIG.llm.provider)
    expect(result.courses).toHaveLength(1)
    expect(result.knowledge.length).toBeGreaterThan(0)
  })

  it('accepts http video links and rejects unsafe schemes', () => {
    expect(validateVideoUrl('https://example.com/video')).toBe(true)
    expect(validateVideoUrl('http://localhost:8080/video.mp4')).toBe(true)
    expect(validateVideoUrl('javascript:alert(1)')).toBe(false)
    expect(validateVideoUrl('')).toBe(false)
  })

  it('maps the supported dialect choices to browser speech locales', () => {
    expect(DIALECTS.map(item => item.id)).toEqual(['mandarin', 'cantonese', 'sichuan', 'wu'])
    expect(DIALECTS.every(item => item.locale)).toBe(true)
  })

  it('matches configured knowledge by keywords and leaves unrelated questions unmatched', () => {
    const config = normalizeConfig(DEFAULT_CONFIG)
    expect(findKnowledgeAnswer('白露嗓子很干', config.knowledge)?.title).toContain('白露')
    expect(findKnowledgeAnswer('火星什么时候下雨', config.knowledge)).toBeNull()
  })

  it('imports the fixed JSON knowledge format', () => {
    const items = parseKnowledgeJson(JSON.stringify([{ id: 'a', title: '肩颈', keywords: ['久坐', '肩'], answer: '起身活动。', source: '文献', tags: ['办公'] }]))
    expect(items[0]).toMatchObject({ id: 'a', title: '肩颈', keywords: '久坐,肩', answer: '起身活动。', source: '文献' })
    expect(findKnowledgeMatches('我久坐肩颈紧', items)).toHaveLength(1)
  })

  it('imports the fixed Markdown knowledge format', () => {
    const items = parseKnowledgeMarkdown('## 久坐肩颈\n关键词：久坐,肩颈\n答案：每小时起身活动。\n来源：办公养生')
    expect(items[0]).toMatchObject({ title: '久坐肩颈', keywords: '久坐,肩颈', answer: '每小时起身活动。', source: '办公养生' })
  })
})
