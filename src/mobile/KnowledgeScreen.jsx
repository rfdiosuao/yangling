import React,{useEffect,useRef,useState} from 'react'
import {PaperPlaneTilt,FileText,CaretRight,ThumbsUp,ThumbsDown,SpeakerHigh} from '@phosphor-icons/react'
import {QUESTIONS,makeAnswer} from './model.js'
import {findKnowledgeMatches,DIALECTS} from './config.js'
import {generateKnowledge} from './service.js'
import BrandIcon from './BrandIcons.jsx'
import {Sheet,VoiceButton} from './controls.jsx'
export default function KnowledgeScreen({config,mode,notify,onDialect}){
  const [input,setInput]=useState(''),[question,setQuestion]=useState(''),[answer,setAnswer]=useState(null),[pending,setPending]=useState(false),[feedback,setFeedback]=useState(null),[sources,setSources]=useState(false),[speaking,setSpeaking]=useState(false)
  const sequence=useRef(0)
  useEffect(()=>()=>{sequence.current++;window.speechSynthesis?.cancel()},[])
  async function ask(q=input){
    if(!q.trim())return notify('先说说你想问的问题吧。')
    window.speechSynthesis?.cancel();setSpeaking(false)
    const id=++sequence.current;setQuestion(q);setInput('');setFeedback(null);setPending(true)
    const risk=makeAnswer(q)
    if(risk.urgent){setAnswer(risk);setPending(false);return}
    try{const result=await generateKnowledge('question',q);if(id===sequence.current)setAnswer({...result,title:result.generated?'根据知识库，可以这样做':result.sources.length?'知识库原文参考':'暂时没有足够依据'})}
    catch{if(id===sequence.current){const matches=findKnowledgeMatches(q,config.knowledge).filter(s=>s.reviewed===true);setAnswer({title:matches.length?'知识库原文参考':'暂时没有足够依据',lines:matches.length?matches.map(s=>s.answer):['暂时无法查到相关知识，可以换个说法或稍后重试。'],sources:matches.map(s=>({title:s.source||s.title,body:s.answer}))});notify('服务暂未连接，未生成新回答。')}}
    finally{if(id===sequence.current)setPending(false)}
  }
  function readAnswer(){
    if(!window.speechSynthesis)return notify('此设备暂不支持朗读。')
    window.speechSynthesis.cancel();if(speaking){setSpeaking(false);return}
    const speech=new SpeechSynthesisUtterance(answer.lines.join('。').replace(/\[\d+\]/g,''));speech.lang='zh-CN';speech.rate=.85;speech.onend=()=>setSpeaking(false);speech.onerror=()=>setSpeaking(false);setSpeaking(true);window.speechSynthesis.speak(speech)
  }
  return <main className="ylm-page ylm-knowledge"><h1>{mode==='parent'?'有问题，问一问':'养生说法靠不靠谱？'}</h1><p className="ylm-subtitle">查到依据，再给你简单回答。</p>
    {mode==='parent'&&<VoiceButton large onText={setInput} notify={notify} dialect={config.dialect}/>}
    <div className="ylm-dialect-row"><label>语音偏好 <select aria-label="选择语音方言" value={config.dialect} onChange={e=>onDialect(e.target.value)}>{DIALECTS.map(d=><option key={d.id} value={d.id}>{d.label}</option>)}</select></label><span title="实际识别能力取决于设备语音服务">以设备支持为准</span></div>
    <form className="ylm-question-input" onSubmit={e=>{e.preventDefault();ask()}}><input aria-label="输入你想问的问题" value={input} onChange={e=>setInput(e.target.value)} placeholder={mode==='parent'?'说完可改字，再点发送':'输入你想问的问题…'}/><VoiceButton onText={setInput} notify={notify} dialect={config.dialect}/><button className="ylm-send" aria-label="发送问题" disabled={pending}><PaperPlaneTilt size={22}/></button></form>
    {!question&&<div className="yl-question-examples"><small>也可以试着问</small>{QUESTIONS.map(q=><button key={q} onClick={()=>ask(q)}>{q}<CaretRight size={18}/></button>)}</div>}
    {question&&<div className="ylm-user-message"><BrandIcon name="user" size={32}/><span>{question}</span></div>}
    <section className="ylm-answer" aria-live="polite" aria-busy={pending}><div className="ylm-answer-top"><BrandIcon name="bot" className="yl-avatar" size={36}/><h2>{pending?'正在查找知识…':answer?.title||'我是养令，慢慢说，我在听'}</h2></div>{!pending&&(answer?<ol>{answer.lines.map((line,i)=><li key={i}>{line}</li>)}</ol>:<p className="yl-empty-copy">从你的问题出发，查阅传统养生与现代健康知识。没有足够依据时，我会直接告诉你。</p>)}</section>
    {answer&&!pending&&<><div className="yl-answer-actions"><button className="ylm-sources" onClick={()=>setSources(true)}><FileText size={23}/>知识依据 {answer.sources.length}<CaretRight size={18}/></button><button className="yl-listen" onClick={readAnswer}><SpeakerHigh size={22}/>{speaking?'停止朗读':'听回答'}</button></div><div className="ylm-feedback"><span>{feedback?'已记下反馈':'回答有用吗？'}</span><button aria-pressed={feedback==='yes'} onClick={()=>setFeedback('yes')}><ThumbsUp size={20}/>有帮助</button><button aria-pressed={feedback==='no'} onClick={()=>setFeedback('no')}><ThumbsDown size={20}/>不太准</button></div></>}
    <p className="ylm-disclaimer">日常养生参考，不代替诊疗。</p>
    {sources&&<Sheet title="知识依据" onClose={()=>setSources(false)}>{answer.sources.length?answer.sources.map((s,i)=><article className="ylm-source-detail" key={i}><h3>[{i+1}] {s.title}</h3><p>{s.body}</p></article>):<p>本次没有可引用的知识条目。</p>}</Sheet>}
  </main>
}
