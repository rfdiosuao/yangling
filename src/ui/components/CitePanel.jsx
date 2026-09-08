/**
 * 引用面板:展示 RAG 检索来源(cites)
 * 编号 [1][2] 按数组顺序渲染,点击徽标可展开查看来源原文。
 * cites: [{ id, source, label, title, text, score }]
 */
import './CitePanel.css'

const SOURCE_LABEL = {
  'engine-kb': '养令知识库',
  docs: '中医养生文献',
}

export default function CitePanel({ cites = [], onClose }) {
  if (!cites?.length) return null
  // BM25 分数是绝对值,按最高分归一化为相对相关度(最高 100%)
  const maxScore = Math.max(...cites.map((c) => c.score || 0), 1)
  return (
    <div className="cite-panel yl-card" role="dialog" aria-label="引文来源">
      <div className="cite-panel-head">
        <span className="cite-panel-title">
          引文来源 <span className="cite-panel-count">{cites.length} 条</span>
        </span>
        <button className="cite-panel-close" onClick={onClose} aria-label="关闭">
          ×
        </button>
      </div>
      <ol className="cite-list">
        {cites.map((c, i) => (
          <li key={c.id} className="cite-item">
            <span className="cite-num">[{i + 1}]</span>
            <div className="cite-body">
              <div className="cite-meta">
                <span className="cite-source">{SOURCE_LABEL[c.source] || c.label || c.source}</span>
                {c.score != null && (
                  <span className="cite-score">相关度 {Math.round(((c.score || 0) / maxScore) * 100)}%</span>
                )}
              </div>
              <p className="cite-title">{c.title}</p>
              <p className="cite-text">{c.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
