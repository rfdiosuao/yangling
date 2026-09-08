import { describe, expect, it, vi } from 'vitest'
import { buildLlmRequest, requestConfiguredLlm } from '../src/mobile/llm.js'

const llm = {
  baseUrl: 'https://api.example.com/v1/',
  apiKey: 'secret',
  model: 'demo-model',
  systemPrompt: '只给简短建议',
}

describe('mobile configurable LLM client', () => {
  it('builds an OpenAI-compatible request from admin settings', () => {
    const request = buildLlmRequest(llm, '晚上泡脚好吗', '知识：水温不宜过高')
    expect(request.url).toBe('https://api.example.com/v1/chat/completions')
    expect(request.options.headers.Authorization).toBe('Bearer secret')
    expect(JSON.parse(request.options.body).model).toBe('demo-model')
    expect(JSON.parse(request.options.body).messages.at(-1).content).toContain('晚上泡脚好吗')
  })

  it('returns a compact answer and accepts an injected fetch implementation', async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '第一点\n第二点' } }] }),
    }))
    await expect(requestConfiguredLlm(llm, '问题', '上下文', fetcher)).resolves.toEqual(['第一点', '第二点'])
    expect(fetcher).toHaveBeenCalledOnce()
  })
})
