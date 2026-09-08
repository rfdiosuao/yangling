/**
 * RAG 检索器:MiniSearch(BM25) + 中文 tokenizer(单字 + 二元组)
 * 零依赖分词、零网络、毫秒级;数据规模 <500 条(双源合计)。
 */
import MiniSearch from 'minisearch'

/** 中文 tokenizer:ASCII 词 + 汉字单字 + 二元组(无分词依赖,中文召回稳定) */
export function tokenizeCN(text) {
  const t = String(text || '').toLowerCase()
  const ascii = t.match(/[a-z0-9]+/g) || []
  const han = (t.match(/[\u4e00-\u9fff]+/g) || []).join('')
  const uni = [...han]
  const bi = []
  for (let i = 0; i < han.length - 1; i++) bi.push(han.slice(i, i + 2))
  return [...ascii, ...uni, ...bi]
}

/** 构建 MiniSearch 索引:title 权重最高,content 最低 */
export function createIndex(docs) {
  const index = new MiniSearch({
    fields: ['title', 'content', 'tags'],
    storeFields: ['id', 'title', 'text', 'source', 'tags'],
    tokenize: tokenizeCN,
    searchOptions: {
      boost: { title: 4, tags: 3, content: 1 },
      prefix: false,
      fuzzy: 0,
    },
  })
  // 注意:minisearch 7.x 的 addAll 返回 undefined,必须显式返回实例
  index.addAll(docs)
  return index
}

/** 统一检索入口 → [{ id, score, title, text, source, tags }] 按相关性降序
 *  注:minisearch 7.x 的 search() 已不支持 limit 选项,须自行截断。 */
export function retrieve(index, query, { topK = 6 } = {}) {
  const q = String(query || '').trim()
  if (!q || !index) return []
  return index
    .search(q)
    .slice(0, topK)
    .map((r) => ({
      id: r.id,
      score: r.score,
      title: r.title,
      text: r.text,
      source: r.source,
      tags: r.tags || [],
    }))
}
