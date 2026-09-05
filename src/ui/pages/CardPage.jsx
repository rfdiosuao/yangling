import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { addPlan, checkIn, loadProfile } from '../../core/profile/store.js'
import './CardPage.css'

const TYPE_META = {
  cup: { label: '一杯', emoji: '🍵', desc: '应时食疗' },
  move: { label: '一动', emoji: '🧘', desc: '穴位/导引' },
  breath: { label: '一息', emoji: '🌬️', desc: '呼吸/作息' },
}

export default function CardPage() {
  const [intervention, setIntervention] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('yangling:lastIntervention'))
    } catch {
      return null
    }
  })
  const [familyMode, setFamilyMode] = useState(false)
  const [completions, setCompletions] = useState({})
  const [checkedIn, setCheckedIn] = useState(false)
  const [toast, setToast] = useState('')

  // 无数据时给一个默认展示(演示兜底,明确标注)
  const cards = useMemo(() => {
    if (intervention?.cards?.length) return intervention.cards
    return [
      { id: 'cup-1', type: 'cup', title: '一杯 · 百合莲子饮', timeSlot: '卯时', time: '05:00-07:00', ingredients: ['百合 10g', '莲子 10g'], method: '沸水冲泡 10 分钟,温饮', reason: '滋阴润肺,清心除烦' },
      { id: 'move-1', type: 'move', title: '一动 · 按揉内关穴', timeSlot: '午时', time: '11:00-13:00', acupoint: '内关穴', location: '腕横纹上 2 寸,两筋之间', method: '拇指按揉 1 分钟,左右交替', reason: '宁心安神,和胃降逆' },
      { id: 'breath-1', type: 'breath', title: '一息 · 4-7-8 呼吸法', timeSlot: '亥时', time: '21:00-23:00', steps: ['吸气 4 秒', '屏息 7 秒', '呼气 8 秒'], repeat: 4, reason: '激活副交感神经,助眠安神' },
    ]
  }, [intervention])

  function toggleCard(id) {
    setCompletions((c) => ({ ...c, [id]: !c[id] }))
  }

  function handleCheckIn() {
    const profile = loadProfile()
    const stateRef = intervention?.context?.matchedState || 'demo'
    const constitution = intervention?.context?.constitution || null
    // 先记一次方案生成(若还没记),再打卡
    addPlan(profile, stateRef, cards.map((c) => c.id), { constitution })
    checkIn(profile, stateRef, cards.map((c) => c.id), completions)
    setCheckedIn(true)
    setToast('✓ 已打卡,数据已存入本机(可随时清除)')
    setTimeout(() => setToast(''), 2500)
  }

  return (
    <div className={'card-page' + (familyMode ? ' is-family' : '')}>
      <div className="card-head">
        <div>
          <h1 className="page-title font-serif">今日养生时序卡</h1>
          <p className="page-subtitle yl-muted">
            {intervention?.context?.solarTerm || '白露'} · {intervention?.context?.constitutionLabel || intervention?.context?.constitution || '阴虚质(可能倾向)'} · {intervention?.summary?.headline || '今日宜滋阴润燥'}
          </p>
        </div>
        <button className="yl-btn yl-btn--ghost family-toggle" onClick={() => setFamilyMode(!familyMode)}>
          {familyMode ? '返回个人版' : '👴 给爸妈版'}
        </button>
      </div>

      {intervention?.safety?.level === 'red_flag' && (
        <div className="risk-banner">
          ⚠️ {intervention.safety.disclaimer}
        </div>
      )}

      {familyMode && (
        <div className="family-banner">
          <strong>给爸妈版</strong> · 大字号 · 口语化 · 适合转发家庭群(仅生活方式建议,不做诊断)
        </div>
      )}

      <div className="card-timeline">
        {cards.map((card, idx) => {
          const meta = TYPE_META[card.type] || TYPE_META.breath
          const done = !!completions[card.id]
          return (
            <div
              key={card.id}
              className={'timeline-item' + (done ? ' is-done' : '') + (idx === 0 ? ' is-first' : '')}
            >
              <div className="timeline-dot">{meta.emoji}</div>
              <div className="yl-card timeline-card">
                <div className="timeline-tag">
                  <span className="tag-type">{meta.label}</span>
                  <span className="tag-time">{card.timeSlot} {card.time || ''}</span>
                </div>
                <h3 className="font-serif">{card.title}</h3>

                {card.ingredients && (
                  <p className="card-body">
                    <strong>食材:</strong> {card.ingredients.join('、')}
                  </p>
                )}
                {card.acupoint && (
                  <p className="card-body">
                    <strong>{card.acupoint}</strong> · {card.location}
                  </p>
                )}
                {card.steps && (
                  <p className="card-body">
                    <strong>步骤:</strong> {card.steps.join(' → ')}
                    {card.repeat ? ` · 重复 ${card.repeat} 轮` : ''}
                  </p>
                )}
                {card.method && <p className="card-body"><strong>做法:</strong> {card.method}</p>}
                {card.reason && <p className="card-reason yl-faint">“{card.reason}”</p>}

                <div className="card-actions">
                  <button className="yl-btn yl-btn--ghost card-done" onClick={() => toggleCard(card.id)}>
                    {done ? '✓ 已完成' : '○ 做完打卡'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="card-summary yl-card">
        <p className="font-serif">{intervention?.summary?.oneLine || '百合莲子饮 + 按揉内关穴 + 4-7-8 呼吸'}</p>
        {intervention?.summary?.constitutionTip && (
          <p className="yl-muted card-tip">{intervention.summary.constitutionTip}</p>
        )}
        <div className="card-summary-actions">
          <button className="yl-btn yl-btn--season" onClick={handleCheckIn} disabled={checkedIn}>
            {checkedIn ? '✓ 今天已打卡' : '☀ 完成今日打卡'}
          </button>
          <Link to="/calendar" className="yl-btn yl-btn--ghost">查看养生日历</Link>
        </div>
        {toast && <p className="card-toast">{toast}</p>}
      </div>

      {!intervention && (
        <p className="card-demo-note yl-faint">(当前为演示兜底数据 — 请先到「说状态」输入你的情况)</p>
      )}

      <p className="card-disclaimer yl-faint">
        {intervention?.safety?.disclaimer || '本方案为生活方式建议,不替代专业诊疗。如有不适请及时就医。'}
      </p>
    </div>
  )
}
