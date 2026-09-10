import {localDate} from './companion.js'
export const GROWTH_KEY='yangling:growth-v1'
const types=['cup','move','breath']
export const STAGES=[{days:0,name:'初见小芽',image:'yangling-companion-v1.png'},{days:7,name:'新芽',image:'yangling-sprout-v1.png'},{days:14,name:'花芽',image:'yangling-bud-v1.png'},{days:30,name:'开花',image:'yangling-bloom-v1.png'}]
export function validDate(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s}
export function normalizeHistory(value){const days={};for(const [date,items] of Object.entries(value?.days||{})){if(validDate(date)&&Array.isArray(items)){const clean=types.filter(x=>items.includes(x));if(clean.length)days[date]=clean}}return {version:1,days}}
export function readGrowth(storage=localStorage){let value={},legacy;try{value=JSON.parse(storage.getItem(GROWTH_KEY))}catch{}try{legacy=JSON.parse(storage.getItem('yangling:pet-completed'))}catch{}const result=normalizeHistory(value);if(validDate(legacy?.date)&&Array.isArray(legacy.items))result.days[legacy.date]=types.filter(x=>(result.days[legacy.date]||[]).includes(x)||legacy.items.includes(x));return normalizeHistory(result)}
export function recordGrowth(history,type,date=localDate()){const next=normalizeHistory(history);if(types.includes(type)&&validDate(date))next.days[date]=types.filter(x=>x===type||(next.days[date]||[]).includes(x));return next}
export function growthStats(history,today=localDate()){
 const days=Object.entries(normalizeHistory(history).days).filter(([date])=>date<=today),total=days.length,full=days.filter(([,items])=>items.length===3).length
 const dates=new Set(days.map(([date])=>date));let cursor=new Date(today+'T12:00:00Z'),streak=0
 if(!dates.has(today))cursor.setUTCDate(cursor.getUTCDate()-1)
 while(dates.has(cursor.toISOString().slice(0,10))){streak++;cursor.setUTCDate(cursor.getUTCDate()-1)}
 const stage=STAGES.filter(x=>total>=x.days).at(-1),next=STAGES.find(x=>total<x.days)
 return {total,full,streak,stage,next}
}
