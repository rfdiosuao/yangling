export const CUES={
 pet_hello_01:'我在呢，今天也陪你照顾好自己。',
 pose_good_01:'真棒，这个动作到位啦！',pose_good_02:'做得很好，保持自然呼吸。',
 pose_excellent_01:'太棒啦，动作又稳又舒展！',pose_improved_01:'比刚才更到位了，慢慢来就很好。',
 pose_in_frame_01:'往后站一点，让我看见你的全身。',pose_arms_01:'在舒服的范围里，手臂再抬高一点。',
 pose_shoulders_01:'肩膀放松一点，别着急。',pose_back_01:'轻轻伸展腰背，保持自然站姿。',
 pose_elbows_level:'慢慢调整，让手肘和肩膀保持同高。',
 done_cup_01:'今天的喝水打卡完成啦，真棒！',done_move_01:'今天又活动了一次，给你点个赞！',
 done_breath_01:'三分钟放松完成啦，谢谢你照顾自己。',done_day_01:'一杯、一动、一息，今天都完成啦！',
}
export const cueUrl=id=>id==='pose_elbows_level'?undefined:`${import.meta.env.BASE_URL}audio/companion/v1/${id}.mp3`
export function poseCue(result){
 if(!result||result.partial)return 'pose_in_frame_01'
 if(!result.armGood)return result.correction||'pose_arms_01'
 if(!result.relaxed)return 'pose_shoulders_01'
 if(!result.aligned)return 'pose_back_01'
 return result.score>=95?'pose_excellent_01':result.score>=90?'pose_good_01':null
}
export function createPetCoach(){
 let candidate=null,since=0,lastAt=-Infinity,previousScore=null
 const repeats=new Map()
 return(result,now)=>{
  const id=poseCue(result)
  if(id!==candidate){candidate=id;since=now;return null}
  if(!id||now-since<2000||now-lastAt<12000)return null
  const good=id==='pose_good_01'||id==='pose_excellent_01'
  let selected=id==='pose_excellent_01'&&now-since<8000?'pose_good_01':id
  if(good&&previousScore!==null&&result.score>=previousScore+5)selected='pose_improved_01'
  if(now-(repeats.get(selected)??-Infinity)<30000)return null
  if(selected==='pose_good_01'&&Math.random()<.5)selected='pose_good_02'
  if(selected==='pose_good_01'||selected==='pose_good_02'){repeats.set('pose_good_01',now);repeats.set('pose_good_02',now)}
  repeats.set(selected,now);lastAt=now
  if(result&&!result.partial)previousScore=result.score
  return selected
 }
}
export function localDate(now=new Date()){return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`}
export function recordCompletion(old,type,date=localDate()){
 const items=old?.date===date&&Array.isArray(old.items)?[...new Set(old.items.filter(x=>['cup','move','breath'].includes(x)))]:[]
 if(!['cup','move','breath'].includes(type)||items.includes(type))return {record:{date,items},cue:null}
 items.push(type)
 return {record:{date,items},cue:items.length===3?'done_day_01':`done_${type}_01`}
}
export function loadCompletion(){try{return recordCompletion(JSON.parse(localStorage.getItem('yangling:pet-completed')),'').record}catch{return recordCompletion(null,'').record}}
export function clampPetPosition(position,maxX,maxY){return {x:Math.max(0,Math.min(position.x,Math.max(0,maxX))),y:Math.max(0,Math.min(position.y,Math.max(0,maxY)))}}
export function petEvent(id){if(CUES[id])window.dispatchEvent(new CustomEvent('yl:pet',{detail:{id}}))}
