import { useMemo, useState } from 'react'
import { loadProfile } from '../../core/profile/store.js'
import './CalendarPage.css'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function dayKey(d) {
  return d.toISOString().slice(0, 10)
}

export default function CalendarPage() {
  const [profile] = useState(() => loadProfile())

  const days = useMemo(() => {
    const checkinDates = new Set((profile.checkins || []).map((c) => c.date))
    const arr = []
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      arr.push({
        key: dayKey(d),
        weekday: WEEKDAYS[d.getDay()],
        day: d.getDate(),
        isToday: i === 0,
        done: checkinDates.has(dayKey(d)),
      })
    }
    return arr
  }, [profile.checkins])

  return (
    <div className="calendar">
      <h1 className="page-title font-serif">养生日历</h1>
      <p className="page-subtitle yl-muted">
        连续坚持 {profile.calendar?.streak?.current || 0} 天 · 最长 {profile.calendar?.streak?.longest || 0} 天
      </p>

      <div className="calendar-week yl-card">
        {days.map((d) => (
          <div key={d.key} className={'cal-day' + (d.done ? ' is-done' : '') + (d.isToday ? ' is-today' : '')}>
            <span className="cal-weekday">周{d.weekday}</span>
            <span className="cal-num font-serif">{d.day}</span>
            <span className="cal-mark">{d.done ? '✓' : ''}</span>
          </div>
        ))}
      </div>

      <div className="calendar-stats">
        <div className="yl-card stat-card">
          <div className="stat-value font-serif">{profile.checkins?.length || 0}</div>
          <div className="stat-label yl-muted">已打卡天数</div>
        </div>
        <div className="yl-card stat-card">
          <div className="stat-value font-serif">{profile.tags?.constitutions?.[0]?.name || '待确定'}</div>
          <div className="stat-label yl-muted">当前体质倾向</div>
        </div>
        <div className="yl-card stat-card">
          <div className="stat-value font-serif">{profile.calendar?.solarTermProgress?.bailu?.completed || 0}/{profile.calendar?.solarTermProgress?.bailu?.total || 7}</div>
          <div className="stat-label yl-muted">白露养生进度</div>
        </div>
      </div>

      <div className="calendar-history">
        <h2 className="font-serif">体质趋势</h2>
        <p className="yl-muted">基于你的打卡记录生成(仅生活方式参考)</p>
        <div className="yl-card trend-placeholder">
          <div className="trend-bars">
            {days.map((d, i) => (
              <div key={d.key} className={'trend-bar' + (d.done ? ' is-done' : '')} style={{ height: `${d.done ? (i % 5) * 12 + 30 : 8}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
