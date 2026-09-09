import React,{useState} from 'react'
import {ACTIVITIES,normalizeReminder,reminderSlots} from './reminder-schedule.js'
import {isAndroidApp,openNotificationSettings} from './native-notifications.js'
import {generateAlias,loadTodaySeconds,formatDuration} from './reminder.js'
export default function ReminderSettings({reminder,alias,mode='child',permission,onSave,onClose}){
  const [draft,setDraft]=useState(()=>normalizeReminder(reminder)),[name,setName]=useState(alias),[error,setError]=useState(''),[busy,setBusy]=useState(false)
  const [step,setStep]=useState(0),parent=mode==='parent'
  const denied=isAndroidApp()&&permission&&permission!=='granted'
  const change=(key,value)=>setDraft(r=>({...r,[key]:value}))
  async function save(){
    if(draft.enabled&&!reminderSlots(draft).length){setError('请选择提醒内容，并留出至少一个不在免打扰时段内的提醒时间。');return}
    setBusy(true);setError('')
    try{await onSave(draft,name.trim());onClose()}catch(e){setError(e.message||'暂未保存，请重试。')}finally{setBusy(false)}
  }
  return <div className="yl-reminder-form">
    <label className="ylm-reminder-row"><span>到点提醒我</span><input type="checkbox" className="ylm-reminder-switch" checked={draft.enabled} onChange={e=>change('enabled',e.target.checked)}/></label>
    {denied&&<p role="status">通知未开启 <button className="ylm-secondary" onClick={()=>openNotificationSettings().catch(()=>setError('请手动打开手机设置 → 应用 → 养令 → 通知。'))}>去设置</button></p>}
    {(!parent||step===0)&&<>
    <label>怎么称呼你<input maxLength={24} value={name} onChange={e=>setName(e.target.value)} placeholder="可不填写"/></label>
    <fieldset><legend>提醒做什么</legend><div className="yl-choice-grid">{Object.entries(ACTIVITIES).map(([key,label])=><label key={key}><input type="checkbox" checked={draft.activities.includes(key)} onChange={e=>change('activities',e.target.checked?[...draft.activities,key]:draft.activities.filter(k=>k!==key))}/>{label}</label>)}</div></fieldset>
    </>}
    {(!parent||step===1)&&<>
    <label>什么时候提醒<select value={draft.scheduleMode} onChange={e=>change('scheduleMode',e.target.value)}><option value="interval">按间隔提醒</option><option value="fixed">每天固定时间</option></select></label>
    {draft.scheduleMode==='interval'?<><label>提醒间隔<select value={draft.intervalMin} onChange={e=>change('intervalMin',Number(e.target.value))}>{[15,30,45,60,90].map(n=><option key={n} value={n}>每 {n} 分钟</option>)}</select></label><div className="yl-two-fields"><label>开始时间<input type="time" value={draft.start} onChange={e=>change('start',e.target.value)}/></label><label>结束时间<input type="time" value={draft.end} onChange={e=>change('end',e.target.value)}/></label></div></>:<div className="yl-fixed-times">{draft.times.map((t,i)=><div key={i}><input aria-label={`提醒时间 ${i+1}`} type="time" value={t} onChange={e=>change('times',draft.times.map((v,j)=>i===j?e.target.value:v))}/><button onClick={()=>change('times',draft.times.filter((_,j)=>j!==i))}>移除</button></div>)}<button onClick={()=>change('times',[...draft.times,'12:00'])}>添加时间</button></div>}
    <details><summary>更多设置</summary><div className="yl-two-fields"><label>免打扰开始<input type="time" value={draft.quietStart} onChange={e=>change('quietStart',e.target.value)}/></label><label>免打扰结束<input type="time" value={draft.quietEnd} onChange={e=>change('quietEnd',e.target.value)}/></label></div><label>最近想照顾什么<select value={draft.state} onChange={e=>{const state=e.target.value;change('state',state);if(state==='肩颈紧')change('activities',['neck']);if(state==='久坐')change('activities',['move']);if(state==='最近疲惫')change('activities',['breath'])}}><option value="">暂不选择</option>{['久坐','肩颈紧','最近疲惫'].map(s=><option key={s}>{s}</option>)}</select></label></details>
    </>}
    {error&&<p role="alert" className="ylm-admin-error">{error}</p>}
    {error.includes('通知未开启')&&isAndroidApp()&&<button className="ylm-secondary" onClick={()=>openNotificationSettings().catch(()=>setError('请手动打开手机设置 → 应用 → 养令 → 通知。'))}>去设置</button>}
    <details><summary>我的养生记录</summary><p>今天使用养令 {formatDuration(loadTodaySeconds())}</p><button className="ylm-secondary" onClick={()=>setName(generateAlias())}>用一个节气昵称</button></details>
    {parent&&step===1&&<button className="ylm-secondary" onClick={()=>setStep(0)}>上一步：提醒内容</button>}
    {parent&&step===0&&draft.enabled?<button className="ylm-primary" onClick={()=>setStep(1)}>下一步：选时间</button>:<button className="ylm-primary" disabled={busy} onClick={save}>{busy?'正在保存…':'保存提醒'}</button>}
  </div>
}
