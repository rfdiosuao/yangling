/**
 * 贴令牌:给卡片打结构化标签(tags) + 组装可溯源引用(cites/citeIds)
 * 编号由 UI 按 intervention.cites 数组顺序渲染 [1][2],不存死数字。
 */
import { TYPE_LABELS, SOURCES } from './rag.js'

/** 每张卡片追加结构化标签:类型 / 时辰 / 依据 */
export function tagCards(cards, stateJson) {
  const inferred = stateJson?.inferred || {}
  const basis = [inferred.matchedState, inferred.constitutionId, inferred.solarTermId]
    .filter(Boolean)
    .join('×') || '通用方案'
  return (cards || []).map((card) => {
    const tags = [
      { k: '类型', v: TYPE_LABELS[card.type] || card.type },
      ...(card.timeSlot ? [{ k: '时辰', v: card.timeSlot }] : []),
      { k: '依据', v: basis },
    ]
    return { ...card, tags }
  })
}

/** 检索命中 → cites(去重、限 8 条);卡片按标签交集关联 citeIds(无交集取前 3) */
export function attachCites(intervention, hits = []) {
  const seen = new Map()
  for (const h of hits) {
    if (seen.has(h.id)) continue
    const label =
      h.source === SOURCES.ENGINE_KB
        ? `养令知识库 · ${(h.tags || []).slice(0, 3).join('/')}`
        : h.source === SOURCES.PAPERS
          ? `学术论文 · ${h.title}`
          : `中医养生文献 · ${h.title}`
    seen.set(h.id, {
      id: h.id,
      source: h.source,
      label,
      title: h.title,
      text: h.text,
      tags: h.tags || [],
      score: Math.round((h.score || 0) * 100) / 100,
    })
  }
  const cites = [...seen.values()].slice(0, 8)

  const cards = (intervention.cards || []).map((card) => {
    const cardTags = new Set((card.tags || []).map((t) => String(t.v)))
    const matched = cites.filter((c) => c.tags.some((t) => cardTags.has(String(t))))
    const citeIds = (matched.length ? matched : cites.slice(0, 3)).map((c) => c.id)
    return { ...card, citeIds }
  })

  return {
    intervention: { ...intervention, cards, cites },
    cites,
  }
}
