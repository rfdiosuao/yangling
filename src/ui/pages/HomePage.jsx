import { Link } from 'react-router-dom'
import { DEMO_QUOTES } from '../../core/demo/states.js'
import heroImg from '../../assets/bg/hero.jpg'
import './HomePage.css'

export default function HomePage() {
  return (
    <div className="home">
      {/* 竖排装饰字(左右两侧,东方质感) */}
      <span className="v-text v-text--left">顺时而养 · 应身而调</span>
      <span className="v-text v-text--right">养令 YANGLING</span>

      <section className="home-hero" style={{ backgroundImage: `url(${heroImg})` }}>
        <div className="home-seal-wrap">
          <span className="home-seal">养</span>
          <span className="home-seal-sub">白露 · 秋金</span>
        </div>
        <p className="home-eyebrow">顺时而养 · 应身而调 · YANGLING</p>
        <h1 className="home-title font-serif">
          说一句话,<br />
          <span className="home-title-accent">养出今天的自己</span>
        </h1>
        <p className="home-slogan font-serif">把节气的温柔,装进今天的时光里</p>
        <p className="home-subtitle">
          懂中国人身体节律的 AI 养生搭子
          <br />
          二十四节气 · 十二时辰 · 九种体质,一张今日养生时序卡
        </p>
        <div className="home-actions">
          <Link to="/chat" className="yl-btn yl-btn--season">开始说状态</Link>
          <Link to="/card" className="yl-btn yl-btn--ghost">看看今日时序</Link>
        </div>
      </section>

      {/* 时辰罗盘(视觉锚点 2) */}
      <section className="home-compass">
        <div className="compass-ring" aria-hidden="true">
          {['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'].map((c, i) => (
            <span key={c} className="compass-char" style={{ '--i': i }}>{c}</span>
          ))}
          <span className="compass-core">今</span>
        </div>
      </section>

      <section className="home-demo">
        <h2 className="home-section-title font-serif">试试这样说</h2>
        <div className="home-quotes">
          {DEMO_QUOTES.map((q, i) => (
            <Link to="/chat" key={q} className="home-quote" style={{ animationDelay: `${i * 0.1}s` }}>
              <span className="home-quote-mark">“</span>{q}<span className="home-quote-mark">”</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-how">
        <h2 className="home-section-title font-serif">三步,顺时而养</h2>
        <div className="home-steps">
          <div className="yl-card home-step">
            <span className="home-step-num font-serif">壹</span>
            <h3>说状态</h3>
            <p className="yl-muted">晨起随口一句:“昨晚3点睡,今天嘴苦、没精神。”</p>
          </div>
          <div className="yl-card home-step">
            <span className="home-step-num font-serif">贰</span>
            <h3>得时令方案</h3>
            <p className="yl-muted">结合节气、时辰、体质,生成今日养生时序卡。</p>
          </div>
          <div className="yl-card home-step">
            <span className="home-step-num font-serif">叁</span>
            <h3>养成立</h3>
            <p className="yl-muted">打卡即完成,7 天养生日历。还能一键转给爸妈。</p>
          </div>
        </div>
      </section>

      <p className="home-disclaimer yl-faint">
        本应用提供的是生活方式建议,不替代专业诊疗。如有不适请及时就医。
      </p>
    </div>
  )
}
