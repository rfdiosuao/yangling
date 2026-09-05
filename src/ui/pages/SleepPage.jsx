import { useState, useEffect, useRef, useCallback } from 'react'
import './SleepPage.css'

const BREATH_PATTERNS = [
  { id: '478', name: '4-7-8 呼吸', inhale: 4, hold: 7, exhale: 8 },
  { id: 'belly', name: '腹式呼吸', inhale: 4, hold: 2, exhale: 6 },
  { id: 'calm', name: '平稳呼吸', inhale: 4, hold: 0, exhale: 4 },
]

export default function SleepPage() {
  const [pattern, setPattern] = useState(BREATH_PATTERNS[0])
  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState('准备')
  const [round, setRound] = useState(0)
  const timerRef = useRef(null)

  // 呼吸循环:跳过 0 时长阶段,停止时清理,重启时重置
  const stop = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    setRunning(false)
    setPhase('准备')
    setRound(0)
  }, [])

  const start = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setRound(0)
    setRunning(true)
    const cycle = ['吸气', '屏息', '呼气']
    const durations = [pattern.inhale, pattern.hold, pattern.exhale]
    let i = 0
    let r = 0

    function tick() {
      // 跳过 0 时长阶段
      while (durations[i % 3] === 0) i += 1
      setPhase(cycle[i % 3])
      if (i % 3 === 2) {
        r += 1
        setRound(r)
        if (r >= 4) {
          setRunning(false)
          setPhase('完成')
          return
        }
      }
      timerRef.current = setTimeout(tick, durations[i % 3] * 1000)
      i += 1
    }
    timerRef.current = setTimeout(tick, 400)
  }, [pattern])

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  // 切换模式时停止
  useEffect(() => {
    stop()
  }, [pattern, stop])

  function handleStartStop() {
    if (running) stop()
    else start()
  }

  return (
    <div className="sleep">
      <h1 className="page-title font-serif">睡前时辰</h1>
      <p className="page-subtitle yl-muted">
        亥时(21:00–23:00),跟着呼吸放松,把今天放下。
      </p>

      <div className="sleep-stage yl-card">
        <div
          className={'breath-orb' + (running ? ' is-running' : '') + (phase === '吸气' ? ' is-inhale' : phase === '呼气' ? ' is-exhale' : '')}
          role="status"
          aria-live="polite"
          aria-label={`呼吸引导:${phase}`}
        >
          <span className="breath-phase font-serif">{phase}</span>
        </div>
        <p className="breath-count yl-muted">{running ? `第 ${round}/4 轮 · ${pattern.name}` : pattern.name + (phase === '完成' ? ' · 已完成' : '')}</p>
      </div>

      <div className="sleep-controls">
        <div className="sleep-patterns">
          {BREATH_PATTERNS.map((p) => (
            <button
              key={p.id}
              className={'sleep-chip' + (pattern.id === p.id ? ' is-active' : '')}
              onClick={() => { setPattern(p); stop() }}
            >
              {p.name}
            </button>
          ))}
        </div>
        <button className="yl-btn yl-btn--season" onClick={handleStartStop}>
          {running ? '停止' : phase === '完成' ? '再来一轮' : '开始跟随呼吸'}
        </button>
      </div>

      <p className="sleep-note yl-faint">
        呼吸练习适合大多数人;如有心肺疾病或不适,请先咨询医生。
      </p>
    </div>
  )
}
