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
    { id: 'white-dew', title: '白露时节嗓子干', keywords: '白露,嗓子,干,秋燥', answer: '多喝温水，减少长时间讲话。', source: '白露节气起居建议', reviewed: false },
    { id: 'overnight-tea', title: '隔夜茶能喝吗', keywords: '隔夜茶,茶水,浓茶', answer: '有异味或变色的茶水建议倒掉。', source: '饮茶与存放', reviewed: false },
    { id: 'footbath', title: '晚上泡脚好吗', keywords: '泡脚,睡前,热水', answer: '可以用舒适温度的水短时泡脚放松。', source: '睡前放松建议', reviewed: false },
  ],
  courses: [
    { id: 'baduanjin', name: '八段锦', moveName: '双手托天', videoUrl: '', enabled: true },
    { id: 'bow', name: '八段锦', moveName: '左右开弓', videoUrl: '', enabled: true },
    { id: 'neck', name: '肩颈操', moveName: '肩颈舒展', videoUrl: '', enabled: true },
  ],
  audio: [
    { id: 'meditation-01', name: 'An Ambient Day（陪伴的一天）', url: 'audio/meditation/ambient-day.mp3', enabled: true },
    { id: 'meditation-02', name: 'The Quiet Morning（安静的早晨）', url: 'audio/meditation/quiet-morning.mp3', enabled: true },
    { id: 'meditation-03', name: 'Deep Meditation（深度冥想）', url: 'audio/meditation/deep-meditation.mp3', enabled: true },
    { id: 'meditation-04', name: 'Healing Water（疗愈之水）', url: 'audio/meditation/healing-water.mp3', enabled: true },
    { id: 'meditation-05', name: 'In The Light（光之中）', url: 'audio/meditation/in-the-light.mp3', enabled: true },
    { id: 'meditation-06', name: 'Cathedral Ambience（教堂氛围）', url: 'audio/meditation/cathedral-ambience.mp3', enabled: true },
    { id: 'meditation-07', name: 'Serenity（宁静）', url: 'audio/meditation/serenity.mp3', enabled: true },
    { id: 'meditation-08', name: "Galaxy's Endless Expanse（无尽银河）", url: 'audio/meditation/galaxy-expanse.mp3', enabled: true },
  ],
  generation: { enabled: false, instructions: '', maxLength: 300, fallback: { cup: '暂时没有已审核的饮品建议。', move: '请在舒适范围内轻缓活动。', breath: '放松肩膀，跟随自己的节奏呼吸。', question: '暂时没有匹配的已审核知识。' } },
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
    sourceUrl: item.sourceUrl ? String(item.sourceUrl) : '',
    reviewed: item.reviewed === true,
    enabled: item.enabled !== false,
  }
}

export function normalizeConfig(raw = {}) {
  const submittedLlm = raw.llm || {}
  const llm = {
    provider: String(submittedLlm.provider ?? DEFAULT_CONFIG.llm.provider),
    baseUrl: String(submittedLlm.baseUrl ?? DEFAULT_CONFIG.llm.baseUrl),
    model: String(submittedLlm.model ?? DEFAULT_CONFIG.llm.model),
    apiKey: String(submittedLlm.apiKey || ''),
    systemPrompt: String(submittedLlm.systemPrompt ?? DEFAULT_CONFIG.llm.systemPrompt),
    configured: Boolean(submittedLlm.configured || submittedLlm.apiKey),
  }
  const submittedGeneration = raw.generation || {}
  const submittedFallback = submittedGeneration.fallback || {}
  const generation = {
    enabled: submittedGeneration.enabled === true,
    instructions: String(submittedGeneration.instructions || ''),
    maxLength: Math.min(1000, Math.max(50, Number(submittedGeneration.maxLength) || 300)),
    fallback: Object.fromEntries(Object.keys(DEFAULT_CONFIG.generation.fallback).map(kind => [kind, String(submittedFallback[kind] ?? DEFAULT_CONFIG.generation.fallback[kind])])),
  }
  return {
    llm,
    dialect: DIALECTS.some(item => item.id === raw.dialect) ? raw.dialect : DEFAULT_CONFIG.dialect,
    knowledge: Array.isArray(raw.knowledge) ? raw.knowledge.map(normalizeKnowledgeItem) : DEFAULT_CONFIG.knowledge.map(normalizeKnowledgeItem),
    courses: Array.isArray(raw.courses) ? raw.courses.map((item, index) => ({ id: item.id || `course-${index + 1}`, name: String(item.name || ''), moveName: String(item.moveName || ''), videoUrl: String(item.videoUrl || ''), enabled: item.enabled !== false })) : DEFAULT_CONFIG.courses.map(item => ({ ...item })),
    audio: Array.isArray(raw.audio) ? raw.audio.map((item, index) => ({ id: String(item.id || `audio-${index + 1}`), name: String(item.name || ''), url: String(item.url || ''), durationSeconds: Math.max(0, Number(item.durationSeconds) || 0), enabled: item.enabled !== false })) : [],
    generation,
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
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !/(^|\.)example\.com$/i.test(url.hostname) } catch { return false }
}

export function findKnowledgeMatches(question, knowledge, limit = 3) {
  const text = String(question || '').toLowerCase()
  if (!text.trim()) return []
  return (knowledge || []).filter(item => String(item.keywords || '').split(/[,，\s]+/).filter(Boolean).some(keyword => text.includes(keyword.toLowerCase()))).slice(0, limit)
}

export function findKnowledgeAnswer(question, knowledge) {
  return findKnowledgeMatches(question, knowledge, 1)[0] || null
}
