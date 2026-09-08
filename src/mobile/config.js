export const CONFIG_KEY = 'yangling:admin-config:v1'

export const DIALECTS = [
  { id: 'mandarin', label: '普通话', locale: 'zh-CN' },
  { id: 'cantonese', label: '粤语', locale: 'zh-HK' },
  { id: 'sichuan', label: '四川话', locale: 'zh-CN' },
  { id: 'wu', label: '吴语', locale: 'zh-CN' },
]

export const LLM_PRESETS = [
  { id: 'deepseek', label: 'DeepSeek', provider: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { id: 'openai', label: 'OpenAI', provider: 'OpenAI Compatible', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { id: 'qwen', label: '通义千问', provider: 'DashScope Compatible', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  { id: 'minimax', label: 'MiniMax', provider: 'MiniMax', baseUrl: 'https://api.minimax.chat/v1', model: 'MiniMax-Text-01' },
  { id: 'custom', label: '自定义兼容服务', provider: '', baseUrl: '', model: '' },
]

export const KNOWLEDGE_FORMATS = [
  { id: 'json', label: 'JSON 标准格式', accept: '.json,application/json' },
  { id: 'markdown', label: 'Markdown 标准格式', accept: '.md,.markdown,text/markdown' },
]

export const KNOWLEDGE_TEMPLATE = `[
  {
    "id": "shoulder-neck-001",
    "title": "久坐肩颈放松",
    "keywords": ["久坐", "肩颈", "僵硬"],
    "answer": "每 40-60 分钟起身活动 2 分钟，在舒适范围内缓慢舒展。",
    "source": "久坐人群的肩颈自救",
    "tags": ["肩颈", "办公"],
    "reviewed": true
  }
]`

export const DEFAULT_CONFIG = {
  llm: {
    provider: 'OpenAI Compatible',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    apiKey: '',
    systemPrompt: '你是养令的养生知识助手。回答简短、清楚，并引用知识库。',
  },
  dialect: 'mandarin',
  knowledge: [
    { id: 'white-dew', title: '白露时节嗓子干', keywords: '白露,嗓子,干,秋燥', answer: '多喝温水，减少长时间讲话；饮食可选择梨、百合、银耳等普通食材，并根据天气及时添衣。', source: '白露节气起居建议' },
    { id: 'overnight-tea', title: '隔夜茶能喝吗', keywords: '隔夜茶,茶水,浓茶', answer: '有异味、变色或长时间在室温放置的茶水建议倒掉。平时用干净茶具，现泡现喝。', source: '饮茶与存放' },
    { id: 'footbath', title: '晚上泡脚好吗', keywords: '泡脚,睡前,热水', answer: '可以用舒适温度的水短时泡脚放松。脚部有伤口、感觉减退或基础疾病时，先咨询医生。', source: '睡前放松建议' },
  ],
  courses: [
    { id: 'baduanjin', name: '八段锦', moveName: '双手托天', videoUrl: 'https://example.com/baduanjin-shuangshoutuotian', enabled: true },
    { id: 'bow', name: '八段锦', moveName: '左右开弓', videoUrl: 'https://example.com/baduanjin-zuoyoukaiGong', enabled: true },
    { id: 'neck', name: '肩颈操', moveName: '肩颈舒展', videoUrl: 'https://www.example.com/shoulder-neck', enabled: true },
  ],
}

function normalizeKnowledgeItem(item, index) {
  const keywords = Array.isArray(item.keywords) ? item.keywords.join(',') : String(item.keywords || '')
  const tags = Array.isArray(item.tags) ? item.tags.map(String) : String(item.tags || '').split(/[,，\s]+/).filter(Boolean)
  return {
    id: item.id || `knowledge-${index + 1}`,
    title: String(item.title || ''),
    keywords,
    answer: String(item.answer || item.content || ''),
    source: String(item.source || item.title || ''),
    tags,
    reviewed: item.reviewed !== false,
  }
}

export function normalizeConfig(raw = {}) {
  return {
    llm: { ...DEFAULT_CONFIG.llm, ...(raw.llm || {}) },
    dialect: DIALECTS.some(item => item.id === raw.dialect) ? raw.dialect : DEFAULT_CONFIG.dialect,
    knowledge: Array.isArray(raw.knowledge) ? raw.knowledge.map(normalizeKnowledgeItem) : DEFAULT_CONFIG.knowledge.map(normalizeKnowledgeItem),
    courses: Array.isArray(raw.courses) ? raw.courses.map((item, index) => ({ id: item.id || `course-${index + 1}`, name: String(item.name || ''), moveName: String(item.moveName || ''), videoUrl: String(item.videoUrl || ''), enabled: item.enabled !== false })) : DEFAULT_CONFIG.courses.map(item => ({ ...item })),
  }
}

export function parseKnowledgeJson(text) {
  const parsed = JSON.parse(text)
  const items = Array.isArray(parsed) ? parsed : parsed.items
  if (!Array.isArray(items) || !items.length) throw new Error('JSON 中没有找到知识条目数组')
  return items.map(normalizeKnowledgeItem).filter(item => item.title && item.answer)
}

export function parseKnowledgeMarkdown(text) {
  const blocks = String(text || '').split(/(?=^##\s+)/m).filter(block => /^##\s+/.test(block.trim()))
  const items = blocks.map((block, index) => {
    const lines = block.trim().split(/\r?\n/)
    const title = lines[0].replace(/^##\s+/, '').trim()
    const fields = {}
    const answerLines = []
    for (const line of lines.slice(1)) {
      const match = line.match(/^[-*]?\s*(标题|关键词|答案|来源|标签)\s*[:：]\s*(.*)$/)
      if (match) fields[match[1]] = match[2].trim()
      else if (line.trim()) answerLines.push(line.trim())
    }
    return normalizeKnowledgeItem({
      id: `markdown-${index + 1}`,
      title,
      keywords: fields['关键词'] || title,
      answer: fields['答案'] || answerLines.join('\n'),
      source: fields['来源'] || title,
      tags: fields['标签'] || '',
    }, index)
  }).filter(item => item.title && item.answer)
  if (!items.length) throw new Error('Markdown 需要使用二级标题分隔知识条目')
  return items
}

export function parseKnowledgeFile(text, format) {
  return format === 'markdown' ? parseKnowledgeMarkdown(text) : parseKnowledgeJson(text)
}

export function loadConfig(storage = globalThis.localStorage) {
  try { return normalizeConfig(JSON.parse(storage?.getItem(CONFIG_KEY) || '{}')) } catch { return normalizeConfig() }
}

export function saveConfig(config, storage = globalThis.localStorage) {
  const next = normalizeConfig(config)
  storage?.setItem(CONFIG_KEY, JSON.stringify(next))
  return next
}

export function validateVideoUrl(value) {
  try { return ['http:', 'https:'].includes(new URL(value).protocol) } catch { return false }
}

export function findKnowledgeMatches(question, knowledge, limit = 3) {
  const text = String(question || '').toLowerCase()
  if (!text.trim()) return []
  return (knowledge || []).filter(item => String(item.keywords || '').split(/[,，\s]+/).filter(Boolean).some(keyword => text.includes(keyword.toLowerCase()))).slice(0, limit)
}

export function findKnowledgeAnswer(question, knowledge) {
  return findKnowledgeMatches(question, knowledge, 1)[0] || null
}
