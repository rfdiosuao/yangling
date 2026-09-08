export function buildLlmRequest(llm, question, context = '') {
  const baseUrl = (llm.baseUrl || '').replace(/\/+$/, '')
  const messages = [
    { role: 'system', content: llm.systemPrompt || '请提供简短、谨慎、易懂的日常养生信息。' },
    { role: 'system', content: '只允许使用下方知识库依据回答，不得补充未出现在依据中的事实。每条回答末尾必须标注对应来源编号，例如 [1]；如果依据不足，请明确说依据不足。' },
  ]
  if (context) messages.push({ role: 'system', content: `知识库依据（必须引用）：\n${context}` })
  messages.push({ role: 'user', content: question })
  return {
    url: `${baseUrl}/chat/completions`,
    options: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(llm.apiKey ? { Authorization: `Bearer ${llm.apiKey}` } : {}),
      },
      body: JSON.stringify({ model: llm.model, messages, temperature: 0.2 }),
    },
  }
}

export async function requestConfiguredLlm(llm, question, context = '', fetcher = fetch) {
  const { url, options } = buildLlmRequest(llm, question, context)
  const response = await fetcher(url, options)
  if (!response.ok) throw new Error(`LLM request failed: ${response.status || 'unknown'}`)
  const payload = await response.json()
  const text = payload?.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('LLM response is empty')
  return text.split(/\n+/).map(line => line.replace(/^\s*(?:[-•]|\d+[.、])\s*/, '').trim()).filter(Boolean).slice(0, 5)
}
