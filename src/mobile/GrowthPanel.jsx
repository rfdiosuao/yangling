import React,{useState} from 'react'
import {growthStats,STAGES} from './growth.js'
import FamilyPanel from './FamilyPanel.jsx'
import {localDate} from './companion.js'
import './growth.css'
export default function GrowthPanel({history}){
 const [view,setView]=useState('growth'),[month,setMonth]=useState(localDate().slice(0,7)),stats=growthStats(history)
 const [year,mon]=month.split('-').map(Number),count=new Date(year,mon,0).getDate(),offset=(new Date(year,mon-1,1).getDay()+6)%7
 function shift(delta){const d=new Date(year,mon-1+delta,1);setMonth(localDate(d).slice(0,7))}
 return <div className="yl-growth"><div className="yl-growth-tabs"><button aria-pressed={view==='growth'} onClick={()=>setView('growth')}>我的成长</button><button aria-pressed={view==='family'} onClick={()=>setView('family')}>家庭陪伴</button></div>{view==='family'?<FamilyPanel/>:<>
 <div className="yl-growth-hero"><img src={`${import.meta.env.BASE_URL}pet/${stats.stage.image}`} alt={stats.stage.name}/><div><h3>{stats.stage.name}</h3><p>我坚持了 {stats.total} 天</p><small>{stats.next?`再陪伴 ${stats.next.days-stats.total} 天，解锁${stats.next.name}`:'小芽开花了，继续一起照顾自己吧'}</small></div></div>
 <p>连续 {stats.streak} 天 · 三项全完成 {stats.full} 天</p><small>每天完成任意一项算一天。中断不退级，记录保存在本机。</small>
 <div className="yl-growth-stages">{STAGES.map(s=><div key={s.days} style={{opacity:stats.total>=s.days?1:.45}}><img src={`${import.meta.env.BASE_URL}pet/${s.image}`} alt=""/><span>{s.name}</span><small>{s.days===0?'初次相见':`${s.days} 天`}</small></div>)}</div>
 <div className="yl-growth-month"><button aria-label="上个月" onClick={()=>shift(-1)}>‹</button><b>{month}</b><button aria-label="下个月" disabled={month>=localDate().slice(0,7)} onClick={()=>shift(1)}>›</button></div>
 <div className="yl-growth-calendar">{['一','二','三','四','五','六','日'].map(x=><small key={x}>{x}</small>)}{Array.from({length:offset},(_,i)=><span key={'empty'+i}/>)}{Array.from({length:count},(_,i)=>{const date=`${month}-${String(i+1).padStart(2,'0')}`,items=history.days[date]||[];return <div key={date} className={items.length?'checked':''} title={items.map(x=>({cup:'一杯',move:'一动',breath:'一息'}[x])).join('、')||'未打卡'}><b>{i+1}</b><small>{['cup','move','breath'].map(x=><span key={x} style={{opacity:items.includes(x)?1:.18}}>●</span>)}</small></div>})}</div><p>圆点依次代表：一杯 · 一动 · 一息</p>{!stats.total&&<p>今天完成一项，让小芽陪你开始吧。</p>}
 </>}</div>
}
