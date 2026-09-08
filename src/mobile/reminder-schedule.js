export const ACTIVITIES = { cup:'喝点水', move:'起身活动', neck:'舒展肩颈', breath:'放松呼吸' }
const validTime = value => /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
const minute = value => Number(value.slice(0,2))*60+Number(value.slice(3))
const timeString = value => `${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`
export function normalizeReminder(raw = {}) {
  return {...raw, enabled:raw.enabled === true, intervalMin:[15,30,45,60,90].includes(Number(raw.intervalMin))?Number(raw.intervalMin):45,
    scheduleMode:raw.scheduleMode === 'fixed'?'fixed':'interval',
    start:validTime(raw.start)?raw.start:'08:00', end:validTime(raw.end)?raw.end:'22:00',
    quietStart:validTime(raw.quietStart)?raw.quietStart:'22:00', quietEnd:validTime(raw.quietEnd)?raw.quietEnd:'08:00',
    times:[...new Set((Array.isArray(raw.times)?raw.times:['09:00','15:00']).filter(validTime))].sort(),
    activities:Array.isArray(raw.activities)?[...new Set(raw.activities.filter(k=>k in ACTIVITIES))]:['move'], state:String(raw.state||'').slice(0,80)}
}
export function reminderSlots(raw) {
  const r=normalizeReminder(raw)
  if (!r.enabled || !r.activities.length) return []
  const inside=(t,a,b)=>a===b?false:a<b?t>=a&&t<b:t>=a||t<b
  const quiet=t=>inside(t,minute(r.quietStart),minute(r.quietEnd))
  if(r.scheduleMode==='fixed') return r.times.filter(t=>!quiet(minute(t)))
  const start=minute(r.start),end=minute(r.end),length=(end-start+1440)%1440
  const slots=[]
  for(let offset=0;offset<length;offset+=r.intervalMin){const t=(start+offset)%1440;if(!quiet(t))slots.push(timeString(t))}
  return slots.sort()
}
export function reminderMessage(raw, alias, index) {
  const r=normalizeReminder(raw), kind=r.activities[index%r.activities.length]||'move'
  return {title:`${alias?.trim()||'朋友'}，${ACTIVITIES[kind]}吧`,body:'方便的话，给自己三分钟，慢慢来。',route:kind==='move'||kind==='neck'?'motion':'home',ritual:kind==='neck'?'move':kind}
}
