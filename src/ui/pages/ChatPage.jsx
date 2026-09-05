import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { extractState, getLlmMode } from '../../core/llm/client.js'
import { runEngine } from '../../core/engine/index.js'
import { DEMO_STATES } from '../../core/demo/states.js'
import './ChatPage.css'

export default function ChatPage() {
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    { role: 'bot', text: '早上好,我是养令。今天感觉怎么样?随便说一句就行,比如:"昨晚没睡好,今天有点累"。' },
  ])
  const [thinking, setThinking] = useState(false)
  const [modeNote] = useState(getLlmMode() === 'mock' ? '演示模式(规则兜底)' : '在线模式')

  async function handleSend() {
    const text = input.trim()
    if (!text || thinking) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', text }])
    setThinking(true)

    try {
      // M1:抽取状态(关键词识别 + 风险检查)→ M2:规则引擎
      const stateJson = await extractState(text)

      // 风险输入:不跳转,直接提示
      if (stateJson.risk?.level === 'red_flag') {
        setMessages((m) => [
          ...m,
          { role: 'bot', text: '⚠️ 您描述的情况可能比较紧急。为了您的安全,请立即就医或拨打急救电话。我无法提供养生建议替代专业诊疗。', risk: true },
        ])
        return
      }

      // 未识别:引导补充信息,不硬出方案
      if (!stateJson.inferred?.matchedState) {
        setMessages((m) => [
          ...m,
          { role: 'bot', text: '我还需要更多信息才能帮你。可以告诉我:睡眠怎么样?有没有哪里不舒服?或者点下面的预置场景试试。', needInfo: true },
        ])
        return
      }

      const intervention = runEngine(stateJson)
      sessionStorage.setItem('yangling:lastState', JSON.stringify(stateJson))
      sessionStorage.setItem('yangling:lastIntervention', JSON.stringify(intervention))

      setMessages((m) => [
        ...m,
        {
          role: 'bot',
          text: `我明白了。按你的情况(${intervention.context.constitutionLabel || intervention.context.constitution} · ${intervention.summary.headline}),今天这份时序卡已经给你排好了——`,
        },
        { role: 'bot', text: intervention.summary.oneLine },
      ])
      navigate('/card')
    } catch (e) {
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
      </div>
      <p className="page-subtitle yl-muted">用自然语言说说今天的感受,养令帮你排一张时序卡。</p>

      <div className="chat-box yl-card">
        <div className="chat-messages">
          {messages.map((m, i) => (
            <div key={i} className={'chat-msg chat-msg--' + m.role + (m.risk ? ' is-risk' : '') + (m.needInfo ? ' is-needinfo' : '')}>
              {m.text}
            </div>
          ))}
          {thinking && <div className="chat-msg chat-msg--bot chat-msg--thinking">养令正在看时令…</div>}
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
