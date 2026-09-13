import { expect, test } from 'vitest'

test('M3 medical requests only use supported user or assistant message roles', async () => {
  const {medicalRequest}=await import('../server/baichuan.mjs')
  const body=JSON.parse(medicalRequest('secret','如何喝水？').body)
  expect(body.messages.every(message=>['user','assistant'].includes(message.role))).toBe(true)
  expect(body.messages.at(-1).content).toContain('如何喝水？')
})

// A missing/remapped evidence number must never become an unrelated citation.
test('medical search preserves citation identity and marks external evidence unreviewed', async () => {
  const module = await import('../server/baichuan.mjs').catch(() => ({}))
  expect(typeof module.parseMedicalAnswer).toBe('function')
  const result = module.parseMedicalAnswer({ choices: [{ finish_reason: 'stop', message: { content: '适量饮水。^[7]^\n结合个人情况。[7]' }, grounding: { evidence: [{ ref_num: 7, title: 'Hydration', url: 'https://pubmed.ncbi.nlm.nih.gov/123/', publication_info: '2025' }] } }] })
  expect(result.lines).toEqual(['适量饮水。[1]', '结合个人情况。[1]'])
  expect(result.sources[0]).toMatchObject({ sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/123/', reviewed: false, kind: 'medical-search' })
  expect(result.basis).toBe('medical-search')
})

test('medical search rejects missing citations, unsafe links and incomplete answers', async () => {
  const module = await import('../server/baichuan.mjs').catch(() => ({}))
  expect(typeof module.parseMedicalAnswer).toBe('function')
  for (const [content, url, finish] of [['建议。[9]', 'https://example.org', 'stop'], ['建议。[1]', 'javascript:alert(1)', 'stop'], ['建议。[1]', 'https://example.org', 'length'], ['无依据建议', 'https://example.org', 'stop']]) {
    expect(() => module.parseMedicalAnswer({ choices: [{ finish_reason: finish, message: { content }, grounding: { evidence: [{ ref_num: 1, title: 'Source', url }] } }] })).toThrow()
  }
})
