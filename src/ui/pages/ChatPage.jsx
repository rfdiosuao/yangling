import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { answer } from '../../core/agent/agent.js'
import { isLlmEnabled } from '../../core/agent/provider.js'
import { DEMO_STATES } from '../../core/demo/states.js'
import CitePanel from '../components/CitePanel.jsx'
import ProviderSettings from '../components/ProviderSettings.jsx'
import './ChatPage.css'

/** 解析消息文本里的 {cite:n} 占位 → [n] 可点击徽标(点击展开来源) */
function renderCites(text, cites, onOpen) {
  const parts = String(text).split(/(\{cite:\d+\})/g)
  return parts.map((part, i) => {
    const m = /^\{cite:(\d+)\}$/.exec(part)
    if (m) {
      const idx = Number(m[1])
      const cite = cites?.[idx]
      if (!cite) return <span key={i}>{part}</span>
      return (
        <button
          key={i}
          className="cite-inline"
          onClick={() => onOpen(cites)}
          title={cite.title}
          aria-label={`引用 ${idx + 1}:${cite.title}`}
        >
          [{idx + 1}]
        </button>
      )
    }
    return <span key={i}>{part}</span>
  })
}

export default function ChatPage() {
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    { role: 'bot', text: '早上好,我是养令。今天感觉怎么样?随便说一句就行,比如:"昨晚没睡好,今天有点累"。' },
  ])
  const [thinking, setThinking] = useState(false)
  const [openCites, setOpenCites] = useState(null)
  const [providerOpen, setProviderOpen] = useState(false)
  const [modeNote, setModeNote] = useState(isLlmEnabled() ? '在线模式(LLM 润色)' : '演示模式(规则检索)')

  function refreshMode() {
    setModeNote(isLlmEnabled() ? '在线模式(LLM 润色)' : '演示模式(规则检索)')
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || thinking) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', text }])
    setThinking(true)

    try {
      // Agent 主链路:安全门禁 → 抽取 → 规则引擎 → RAG 引用 → 记忆 → (可选)LLM
      const res = await answer(text)

      // 红旗症状:直接就医提示,不出干预
      if (res.redFlag) {
        setMessages((m) => [
          ...m,
          { role: 'bot', text: '⚠️ 您描述的情况可能比较紧急。为了您的安全,请立即就医或拨打急救电话。我无法提供养生建议替代专业诊疗。', risk: true },
        ])
        return
      }

      // 未识别:引导补充信息,不硬出方案
      if (res.needInfo) {
        setMessages((m) => [
          ...m,
          { role: 'bot', text: '我还需要更多信息才能帮你。可以告诉我:睡眠怎么样?有没有哪里不舒服?或者点下面的预置场景试试。', needInfo: true },
        ])
        return
      }

      const intervention = res.intervention
      const cites = res.cites || intervention?.cites || []

      setMessages((m) => [
        ...m,
        {
          role: 'bot',
          text: `我明白了。按你的情况(${intervention.context.constitutionLabel || intervention.context.constitution} · ${intervention.summary.headline}),今天这份时序卡已经给你排好了——`,
        },
        { role: 'bot', text: `${intervention.summary.oneLine}{cite:0}`, cites },
      ])
      navigate('/card')
    } catch (e) {
      console.warn('[yangling] answer 失败:', e)
      setMessages((m) => [...m, { role: 'bot', text: '抱歉,刚才走神了。能再说一遍吗?' }])
    } finally {
      setThinking(false)
    }
  }

  function handleDemo(demoId) {
    const demo = DEMO_STATES.find((d) => d.id === demoId)
    if (demo) setInput(demo.input)
  }

  return (
    <div className="chat">
      <div className="chat-head">
        <h1 className="page-title font-serif">说状态</h1>
        <span className="mode-badge">{modeNote}</span>
        <button className="provider-btn" onClick={() => setProviderOpen(true)} title="接入 LLM(可选,只润色文案)">
          ⚙ 接入 LLM
        </button>
      </div>
      {providerOpen && (
        <ProviderSettings onClose={() => setProviderOpen(false)} onChanged={refreshMode} />
      )}
      <p className="page-subtitle yl-muted">用自然语言说说今天的感受,养令帮你排一张时序卡。</p>

      <div className="chat-box yl-card">
        <div className="chat-messages">
          {messages.map((m, i) => (
            <div
              key={i}
              className={'chat-msg chat-msg--' + m.role + (m.risk ? ' is-risk' : '') + (m.needInfo ? ' is-needinfo' : '')}
            >
              {m.cites ? renderCites(m.text, m.cites, setOpenCites) : m.text}
            </div>
          ))}
          {thinking && <div className="chat-msg chat-msg--bot chat-msg--thinking">养令正在看时令…</div>}
          {openCites && <CitePanel cites={openCites} onClose={() => setOpenCites(null)} />}
        </div>
        <div className="chat-input">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="比如:昨晚3点睡,今天嘴苦、没精神…"
            disabled={thinking}
            aria-label="描述你的状态"
          />
          <button className="yl-btn yl-btn--season" onClick={handleSend} disabled={thinking}>
            发送
          </button>
        </div>
      </div>

      <div className="chat-demos">
        <p className="yl-faint">或点一下试试:</p>
        <div className="chat-demo-list">
          {DEMO_STATES.map((d) => (
            <button key={d.id} className="chat-demo-chip" onClick={() => handleDemo(d.id)}>
              {d.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
