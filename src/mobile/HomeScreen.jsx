import React,{useEffect,useRef,useState} from 'react'
import {PaperPlaneTilt,CaretRight,CheckCircle} from '@phosphor-icons/react'
import {makePlan,STATES} from './model.js'
import {generateKnowledge} from './service.js'
import {getSolarTerm} from './reminder.js'
import BrandIcon from './BrandIcons.jsx'
import {Sheet,VoiceButton} from './controls.jsx'
import AudioSession from './AudioSession.jsx'
import ReadAloud from './ReadAloud.jsx'
import {stopSpeech} from './speech.js'
const titles={cup:'喝点水',move:'活动一下',breath:'放松呼吸'}
export default function HomeScreen({mode,config,notify,onMove,completed,onComplete,initialRitual}){
  const [text,setText]=useState(''),[plan,setPlan]=useState(()=>makePlan('')),[selected,setSelected]=useState(null),[busy,setBusy]=useState(false)
  const sequence=useRef(0)
  const requestId=useRef(0)
  useEffect(()=>()=>{requestId.current++;stopSpeech()},[])
  function closeCard(){requestId.current++;setSelected(null);stopSpeech()}
  async function openCard(card){
    const id=++requestId.current;stopSpeech();setSelected({...card,loading:true})
    try{const result=await generateKnowledge(card.type,text.trim()||`我想${titles[card.type]}，给我简单的日常建议`);if(id!==requestId.current)return
      const next={...card,loading:false,detail:result.lines.join('\n'),sources:result.sources,generated:result.generated,basis:result.basis,reason:result.reason}
      setSelected(next);setPlan(p=>({...p,cards:p.cards.map(c=>c.type===card.type?next:c)}))
    }catch{if(id===requestId.current)setSelected({...card,loading:false,reason:'服务暂不可用，请重试'})}
  }
  useEffect(()=>()=>{sequence.current++},[])
  useEffect(()=>{setPlan(current=>current.urgent?current:{...current,cards:current.cards.map(card=>card.generated?card:{...card,detail:config.generation?.fallback?.[card.type]||card.detail})})},[config.generation?.fallback])
  useEffect(()=>{if(initialRitual&&!plan.urgent)setSelected(plan.cards.find(c=>c.type===(initialRitual.type||initialRitual)))},[initialRitual])
  async function generate(value=text){
    if(!value.trim()){notify('先说说你现在的感受吧。');return}
    setText(value);const next=makePlan(value),seq=++sequence.current;if(next.cards)next.cards=next.cards.map(card=>({...card,detail:config.generation?.fallback?.[card.type]||card.detail}));setPlan(next)
    if(next.urgent){setBusy(false);return}
    if(!config.generation?.enabled)return
    setBusy(true)
    const cards=await Promise.all(next.cards.map(async card=>{
      try{const result=await generateKnowledge(card.type,value);return {...card,subtitle:result.generated?result.lines[0].replace(/\[\d+\]/g,'').slice(0,36):card.subtitle,detail:result.lines.join('\n'),sources:result.sources,generated:result.generated,basis:result.basis,reason:result.reason}}
      catch{return {...card,detail:config.generation?.fallback?.[card.type]||card.detail,reason:'服务暂不可用，显示基础建议'}}
    }))
    if(seq===sequence.current){setPlan({...next,cards});setBusy(false)}
  }
  const parent=mode==='parent'
  return <main className="ylm-page ylm-home">
    <section className="ylm-home-intro"><p className="yl-season">{getSolarTerm()} · 顺时照顾自己</p><h1>{parent?'今天，照顾好自己':'今天感觉怎么样？'}</h1><p className="ylm-subtitle">{parent?'说说感受，或选一件想做的事。':'从一杯、一动、一息开始。'}</p>
      {parent&&<VoiceButton large onText={setText} notify={notify} dialect={config.dialect}/>}
      <form className="ylm-state-input" onSubmit={e=>{e.preventDefault();generate()}}><input aria-label="输入你现在的感受" placeholder={parent?'也可以打字说一说':'输入你现在的感受…'} value={text} onChange={e=>setText(e.target.value)}/><div className="ylm-state-action">{text.trim()?<button className="ylm-send-state" aria-label="生成养生建议" disabled={busy}><PaperPlaneTilt size={25}/></button>:<VoiceButton onText={setText} notify={notify} dialect={config.dialect}/>}</div></form>
      {parent?<details className="yl-state-details"><summary>选一个最近的感受</summary><div className="ylm-state-chips">{STATES.map(s=><button className="ylm-chip" key={s} onClick={()=>generate(s)}>{s}</button>)}</div></details>:<div className="ylm-state-chips">{STATES.map(s=><button className={`ylm-chip ${text===s?'selected':''}`} key={s} onClick={()=>generate(s)}>{s}</button>)}</div>}
    </section>
    {(busy||text)&&<p className={`ylm-plan-message ${plan.urgent?'urgent':''}`} role="status">{busy?'正在根据知识库整理建议…':plan.message}</p>}
    {!plan.urgent&&<div className="ylm-rituals">{plan.cards.map(card=><button className="ylm-ritual" key={card.type} onClick={()=>openCard(card)}><BrandIcon className="yl-ritual-symbol" name={card.type} size={48}/><span><strong>{parent?titles[card.type]:card.title}</strong><small>{completed.includes(card.type)?'今天已完成，随时再来':parent?`${card.title} · 给自己三分钟`:card.subtitle}</small></span>{completed.includes(card.type)?<CheckCircle className="yl-card-arrow" size={22}/>:<CaretRight className="yl-card-arrow" size={20}/>}</button>)}</div>}
    {selected&&<Sheet title={parent?titles[selected.type]:`${selected.title} · ${titles[selected.type]}`} onClose={closeCard}>
      <p className="ylm-sheet-copy" role="status">{selected.loading?'正在为你整理建议…':selected.detail}</p>
      {!selected.loading&&<><p className="yl-source-label">{selected.generated?(selected.basis==='general'?'AI 通用建议 · 未引用知识库':'由已配置知识库整理'):selected.reason||'基础建议'}</p><div className="yl-answer-actions"><ReadAloud text={selected.detail} notify={notify}/><button className="yl-listen" onClick={()=>openCard(selected)}>换个建议</button></div></>}
      {!!selected.sources?.length&&<details className="yl-source-list"><summary>知识依据 · {selected.sources.length} 条</summary>{selected.sources.map((s,i)=><article key={i}><strong>[{i+1}] {s.title}</strong><p>{s.body}</p></article>)}</details>}
      {selected.type==='breath'?<AudioSession tracks={config.audio} onComplete={()=>{onComplete('breath');notify('三分钟的放松，已为你记下。')}}/>:<button className="ylm-primary" onClick={()=>{closeCard();if(selected.type==='move')onMove();else{onComplete('cup');notify('这一杯，记下了。')}}}>{selected.action}</button>}
    </Sheet>}
  </main>
}
