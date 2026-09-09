import React,{useEffect,useRef,useState} from 'react'
import {Camera,CameraSlash,Play,LockSimple,CaretRight} from '@phosphor-icons/react'
import {EXERCISES,scorePose} from './model.js'
import {validateVideoUrl} from './config.js'
import {Sheet} from './controls.jsx'
import BrandIcon from './BrandIcons.jsx'
import {speakPet,stopSpeech} from './speech.js'
import {createPetCoach} from './companion.js'
export default function MotionScreen({mode,courses,notify,onComplete}){
  const options=courses.filter(c=>c.enabled)
  const [chosen,setChosen]=useState(null),[guide,setGuide]=useState(false),[camera,setCamera]=useState('off'),[result,setResult]=useState(null),[detail,setDetail]=useState(false)
  const video=useRef(null),canvas=useRef(null),stream=useRef(null),frame=useRef(null),generation=useRef(0)
  const [voiceEnabled,setVoiceEnabled]=useState(true)
  const coach=useRef(createPetCoach()),voiceBusy=useRef(false)
  const latestResult=useRef(result)
  latestResult.current=result
  useEffect(()=>{
    if(camera!=='live'||!voiceEnabled)return
    const timer=setInterval(()=>{
      if(voiceBusy.current||document.visibilityState!=='visible')return
      const message=coach.current(latestResult.current,performance.now())
      if(!message)return
      voiceBusy.current=true;speakPet(message).catch(()=>{setVoiceEnabled(false);notify('语音暂不可用，请检查手机中文语音引擎。')}).finally(()=>{voiceBusy.current=false})
    },500)
    return()=>clearInterval(timer)
  },[camera,voiceEnabled])
  useEffect(()=>{coach.current=createPetCoach();stopSpeech()},[camera,voiceEnabled,chosen])
  useEffect(()=>()=>{stopSpeech()},[])
  const course=options.find(c=>c.id===chosen)||options[0]
  const index=EXERCISES.findIndex(e=>e.name===course?.moveName),exercise=EXERCISES[index]
  function stop(){generation.current++;cancelAnimationFrame(frame.current);stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;setCamera('off');setResult(null)}
  useEffect(()=>()=>{generation.current++;cancelAnimationFrame(frame.current);stream.current?.getTracks().forEach(t=>t.stop())},[])
  useEffect(()=>{if(chosen&&!options.some(c=>c.id===chosen)){stop();setChosen(null)}},[courses])
  useEffect(()=>{if(mode==='parent'&&!chosen)stop()},[mode,chosen])
  async function start(){
    if(camera!=='off'){stop();return}
    if(index<0){notify('这个动作暂不支持识别，可以观看教学视频。');return}
    const current=++generation.current;setCamera('loading')
    try{
      const media=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280},height:{ideal:720}},audio:false})
      if(current!==generation.current){media.getTracks().forEach(t=>t.stop());return}
      stream.current=media;video.current.srcObject=media;await video.current.play()
      const pose=await import('../core/motion/pose-detector.js'),detector=await pose.getPoseLandmarker()
      if(current!==generation.current)return
      setCamera('live');let last=0
      const tick=time=>{
        if(current!==generation.current)return
        if(time-last>150&&video.current?.readyState>=2){
          last=time
          try{const points=pose.detectPose(detector,video.current,time);canvas.current.width=video.current.videoWidth;canvas.current.height=video.current.videoHeight;if(points)pose.drawSkeleton(canvas.current,points);else canvas.current.getContext('2d').clearRect(0,0,canvas.current.width,canvas.current.height);setResult(scorePose(points,index))}
          catch{stop();notify('识别暂时中断，请重试。');return}
        }
        frame.current=requestAnimationFrame(tick)
      };frame.current=requestAnimationFrame(tick)
    }catch(e){if(current!==generation.current)return;stop();notify(e.name==='NotAllowedError'?'请允许摄像头权限，或先看示范。':'摄像头或识别模型暂不可用，可以先看示范。')}
  }
  if(mode==='parent'&&!chosen)return <main className="ylm-page yl-motion-select"><p className="yl-season">第一步 · 选一个动作</p><h1>今天，想练什么？</h1><p className="ylm-subtitle">不着急，选好后带你一步步练。</p><div className="yl-course-list">{options.map(c=><button key={c.id} onClick={()=>setChosen(c.id)}><BrandIcon name="move" size={38}/><span><small>{c.name}</small><strong>{c.moveName}</strong></span><CaretRight size={23}/></button>)}</div>{!options.length&&<p>暂未配置教学动作。</p>}</main>
  return <main className="ylm-page ylm-motion"><h1>{mode==='parent'?course?.moveName||'跟着练':'跟着练，慢慢来'}</h1><p className="ylm-subtitle">{camera==='live'?'保持自然呼吸，不勉强抬高。':'先看示范，再打开摄像头。'}</p>
    {mode==='parent'?<button className="yl-back" onClick={()=>{stop();setChosen(null)}}>重新选动作</button>:<label className="yl-course-select">练习动作<select value={course?.id||''} onChange={e=>{stop();setChosen(e.target.value)}}>{options.map(c=><option key={c.id} value={c.id}>{c.name} · {c.moveName}</option>)}</select></label>}
    <div className={`ylm-camera-view ${camera!=='off'?'camera-on':''}`}><div className="ylm-demo-photo" role="img" aria-label="双手托天参考姿势"/><video ref={video} muted playsInline aria-label="本机摄像头实时画面"/><canvas ref={canvas} aria-hidden="true"/><span className="ylm-camera-badge">{camera==='off'?'参考姿势 · 非实时画面':camera==='loading'?'正在准备…':'摄像头已开启'}</span></div>
    <div className="yl-motion-feedback" role="status">{camera==='off'?'准备好了，就开始跟练':result?.hint||'请让全身进入画面'}</div>
    <button className="yl-detail-button" aria-pressed={voiceEnabled} onClick={()=>setVoiceEnabled(v=>!v)}>{voiceEnabled?'语音指导已开启':'语音指导已关闭'}</button>
    <div className="yl-motion-buttons"><button className="ylm-secondary" onClick={()=>{stop();setGuide(true)}}><Play size={20}/>先看示范</button><button className="ylm-primary" disabled={!exercise} onClick={start}>{camera==='off'?<Camera size={20}/>:<CameraSlash size={20}/>} {camera==='off'?'开始跟练':camera==='loading'?'取消准备':'暂停跟练'}</button></div>
    <button className="yl-detail-button" onClick={()=>setDetail(true)}>查看动作细项{result?` · ${result.score} 分`:''}<CaretRight size={16}/></button>
    {camera==='live'&&<p className="ylm-camera-privacy"><LockSimple size={13}/>画面在本机处理，不上传保存。</p>}
    {detail&&<Sheet title="动作参考" onClose={()=>setDetail(false)}>{result?<><h3>本次参考评分：{result.score} 分</h3>{[['手臂位置',result.armGood],['肩部平衡',result.relaxed],['身体对齐',result.aligned]].map(([label,ok])=><p key={label}>{label}：{ok?'良好':'可以调整'}</p>)}<p>基于可见关键点位置，仅作练习参考。</p></>:<p>还没有有效识别结果。开启摄像头并让全身进入画面后，再查看动作细项。</p>}</Sheet>}
    {guide&&<Sheet title={`${course?.name||''} · ${course?.moveName||'标准示范'}`} onClose={()=>setGuide(false)}>
      {course&&validateVideoUrl(course.videoUrl)?(/\.(mp4|webm|ogg)(\?|$)/i.test(course.videoUrl)?<video className="yl-teaching-video" src={course.videoUrl} controls playsInline/>:<a className="ylm-primary" href={course.videoUrl} target="_blank" rel="noreferrer">打开教学视频</a>):<p className="yl-source-label">暂未配置示范视频，以下为基础动作提示。</p>}
      {exercise&&<ol className="ylm-guide-steps">{exercise.steps.map(s=><li key={s}>{s}</li>)}</ol>}<p>在舒适范围内练习，出现不适就停止。</p><button className="ylm-primary" onClick={()=>{setGuide(false);onComplete('move');notify('今天的练习，记下了。')}}>完成练习</button>
    </Sheet>}
  </main>
}
