import { useState } from 'react'
import { loadProfile, clearProfile } from '../../core/profile/store.js'
import './FamilyPage.css'

export default function FamilyPage() {
  const [intervention, setIntervention] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('yangling:lastIntervention'))
    } catch {
      return null
    }
  })
  const [copied, setCopied] = useState(false)
  const [cleared, setCleared] = useState(false)

  // 给爸妈版的简化文案(骨架:复用时序卡内容,大字口语化)
  const familyText = {
    headline: intervention?.summary?.headline || '今日宜滋阴润燥',
    cards: intervention?.cards?.map((c) => c.title) || ['一杯 · 百合莲子饮', '一动 · 按揉内关穴', '一息 · 4-7-8 呼吸法'],
    disclaimer: '这是生活方式建议,不是看病。身体不舒服要去医院。',
  }

  async function handleCopy() {
    const text = '爸妈,今天记得:1. ' + familyText.cards.join(' 2. ')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
      alert('复制失败,请手动长按复制。')
    }
  }

  function handleClear() {
    clearProfile()
    setCleared(true)
    setTimeout(() => setCleared(false), 2000)
  }

  return (
    <div className="family">
      <h1 className="page-title font-serif">家庭守护</h1>
      <p className="page-subtitle yl-muted">
        把今天的养生方,一键转成给爸妈的大字卡片。子女的关心,爸妈看得懂。
      </p>

      <div className="family-card">
        <div className="family-card-head">
          <span className="font-serif">今日养生 · 给爸妈版</span>
          <span className="family-badge">大字版</span>
        </div>
        <h2 className="family-headline font-serif">{familyText.headline}</h2>
        <div className="family-list">
          {familyText.cards.map((c, i) => (
            <div key={i} className="family-item">
              <span className="family-num">{i + 1}</span>
              <span>{c}</span>
            </div>
          ))}
        </div>
        <p className="family-disclaimer">{familyText.disclaimer}</p>
        <div className="family-actions">
          <button className="yl-btn yl-btn--season" onClick={handleCopy}>
            {copied ? '✓ 已复制' : '复制转发家庭群'}
          </button>
        </div>
      </div>

      <div className="family-note yl-card">
        <h3 className="font-serif">隐私说明</h3>
        <p className="yl-muted">
          你的健康数据只保存在这台设备的浏览器本地(<strong>不上传任何服务器</strong>),可随时清除。
        </p>
        <button className="yl-btn yl-btn--ghost family-clear" onClick={handleClear}>
          {cleared ? '✓ 已清除' : '清除本机数据'}
        </button>
      </div>
    </div>
  )
}
