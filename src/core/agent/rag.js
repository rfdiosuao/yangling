/**
 * RAG 语料构建与检索入口(三数据源)
 * 源1 engine-kb:knowledge.json 展平(结构化干预,精确命中)
 * 源2 docs:中医养生知识切片
 * 源3 papers:用户提供的学术论文切片(八段锦/太极拳姿态评估等,全部回答可溯源)
 * 数据 <1000 条,索引毫秒级,懒加载单例。
 */
import knowledge from '../engine/knowledge.json'
import docsData from '../rag/docs.js'
import papersData from '../rag/papers.js'
import { createIndex, retrieve as doRetrieve } from './retriever.js'

export const SOURCES = { ENGINE_KB: 'engine-kb', DOCS: 'docs', PAPERS: 'papers' }

export const TYPE_LABELS = { cup: '一杯', move: '一动', breath: '一息' }

/** 展平 interventions 为检索条目:每张卡片一条,附状态/体质/节气/类型标签 */
export function buildEngineCorpus(kb) {
  const docs = []
  const stateMap = Object.fromEntries((kb.states || []).map((s) => [s.id, s.name]))
  const constitutionMap = Object.fromEntries((kb.constitutions || []).map((c) => [c.id, c.name]))
  const termMap = Object.fromEntries((kb.solarTerms || []).map((t) => [t.id, t.name]))

  for (const [stateId, byConstitution] of Object.entries(kb.interventions || {})) {
    for (const [constitutionId, byTerm] of Object.entries(byConstitution || {})) {
      for (const [termId, plan] of Object.entries(byTerm || {})) {
        for (const [idx, card] of (plan.cards || []).entries()) {
          docs.push(toDoc(card, idx, {
            state: stateMap[stateId] || stateId,
            constitution: constitutionMap[constitutionId] || constitutionId,
            term: termMap[termId] || termId,
            tip: plan.summary?.constitutionTip,
          }))
        }
      }
    }
  }
  // fallback 兜底方案也纳入索引(未匹配状态的通用条目)
  for (const [idx, card] of (kb.fallback?.cards || []).entries()) {
    docs.push(toDoc(card, idx, { state: '通用', constitution: '通用', term: '通用', tip: kb.fallback?.summary?.constitutionTip }))
  }
  return docs
}

function toDoc(card, idx, meta) {
  const tags = [
    meta.state,
    meta.constitution,
    meta.term,
    TYPE_LABELS[card.type] || card.type,
    card.timeSlot,
  ].filter(Boolean)
  const text = [
    card.method,
    card.ingredients?.join('、'),
    card.reason,
    card.steps?.join('→'),
    card.acupoint ? `${card.acupoint}${card.location ? '·' + card.location : ''}` : '',
    meta.tip,
  ].filter(Boolean).join(' ')
  return {
    id: `kb:${meta.state}:${meta.constitution}:${meta.term}:${idx}`,
    title: card.title,
    text,
    tags,
    source: SOURCES.ENGINE_KB,
  }
}

/** 第二数据源直接映射 */
export function buildDocsCorpus(docsData) {
  return (docsData || []).map((d) => ({
    id: d.id,
    title: d.title,
    text: d.content,
    tags: d.tags || [],
    source: SOURCES.DOCS,
  }))
}

/** 第三数据源:学术论文切片 */
export function buildPapersCorpus(papersData) {
  return (papersData || []).map((d) => ({
    id: d.id,
    title: d.title,
    text: d.content,
    tags: d.tags || [],
    source: SOURCES.PAPERS,
  }))
}

/** 懒加载单例(<500 条,索引毫秒级) */
let ragPromise = null
export function getRag() {
  if (!ragPromise) ragPromise = buildRag()
  return ragPromise
}

export async function buildRag() {
  const docs = [
    ...buildEngineCorpus(knowledge),
    ...buildDocsCorpus(docsData),
    ...buildPapersCorpus(papersData),
  ]
  const index = createIndex(docs)
  return {
    index,
    docs,
    retrieve: (q, opts) => doRetrieve(index, q, opts),
  }
}
