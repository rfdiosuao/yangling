import papers from '../src/core/rag/papers.js'
const topics=[['八段锦','baduanjin','eight section'],['太极','tai chi','taichi','taijiquan'],['五禽戏','wuqinxi'],['易筋经','yijinjing'],['跌倒','fall','balance'],['认知','cognitive','cognition'],['睡眠','sleep'],['呼吸','breathing'],['抑郁','depression'],['焦虑','anxiety'],['颈椎','neck pain']]
const corpus=papers.map(p=>({...p,haystack:`${p.title} ${(p.tags||[]).join(' ')} ${p.content}`.toLowerCase()}))
export function researchStats(){return {papers:new Set(papers.map(p=>p.title)).size,chunks:papers.length}}
export function searchResearch(question,limit=3){
  const q=String(question||'').toLowerCase().slice(0,1000)
  const selected=topics.filter(group=>group.some(term=>q.includes(term)))
  if(!selected.length)return []
  const terms=selected.flat(),seen=new Set(),hits=[]
  const ranked=corpus.map(p=>({p,score:terms.reduce((sum,t)=>sum+(p.title.toLowerCase().includes(t)?10:0)+((p.tags||[]).join(' ').toLowerCase().includes(t)?5:0)+(p.content.toLowerCase().includes(t)?3:0),0)})).filter(x=>x.score>0&&x.p.content.length>80).sort((a,b)=>b.score-a.score)
  for(const {p} of ranked){if(seen.has(p.title))continue;seen.add(p.title);hits.push({id:p.id,title:p.title,body:p.content.slice(0,1200),reviewed:false,kind:'research'});if(hits.length>=Math.max(1,Math.min(5,limit)))break}
  return hits
}
