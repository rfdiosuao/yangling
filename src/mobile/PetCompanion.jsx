import React,{useEffect,useRef,useState} from 'react'
import {Minus} from '@phosphor-icons/react'
import {CUES,clampPetPosition} from './companion.js'
import {speakPet,stopSpeech} from './speech.js'
import './pet.css'

const images={idle:'yangling-companion-v1.png',happy:'yangling-happy-v1.png',rest:'yangling-rest-v1.png'}
export default function PetCompanion({completed,hidden=false}){
 const host=useRef(null),drag=useRef(null),lastClick=useRef(-Infinity),reset=useRef(null),suppressClick=useRef(false)
 const [position,setPosition]=useState({x:0,y:0}),[bounds,setBounds]=useState({x:0,y:0}),[ready,setReady]=useState(false)
 const [minimized,setMinimized]=useState(false),[pose,setPose]=useState('idle'),[message,setMessage]=useState(''),[blocked,setBlocked]=useState(false)
 useEffect(()=>{
  const app=host.current?.parentElement;if(!app)return
  const measure=()=>{const max={x:Math.max(0,app.clientWidth-92),y:Math.max(0,app.clientHeight-(app.querySelector('nav')?.clientHeight||80)-132)};setBounds(max)
   setPosition(old=>clampPetPosition(old,max.x,max.y))
  }
  measure()
  const max={x:Math.max(0,app.clientWidth-92),y:Math.max(0,app.clientHeight-(app.querySelector('nav')?.clientHeight||80)-132)}
  let saved;try{saved=JSON.parse(localStorage.getItem('yangling:pet-position'))}catch{}
  setPosition(clampPetPosition(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.y)?{x:saved.x*max.x,y:saved.y*max.y}:max,max.x,max.y));setReady(true)
  const resize=new ResizeObserver(measure);resize.observe(app)
  const observer=new MutationObserver(()=>setBlocked(Boolean(app.querySelector('.ylm-overlay,.ylm-admin-overlay'))));observer.observe(app,{childList:true,subtree:true})
  return()=>{resize.disconnect();observer.disconnect()}
 },[])
 useEffect(()=>{
  const react=event=>{const id=event.detail?.id;if(!CUES[id])return;clearTimeout(reset.current);setPose(/good|excellent|improved|done/.test(id)?'happy':'idle');setMessage(CUES[id]);reset.current=setTimeout(()=>{setPose('idle');setMessage('')},5000)}
  const visible=()=>{if(document.visibilityState!=='visible')stopSpeech()}
  window.addEventListener('yl:pet',react);document.addEventListener('visibilitychange',visible)
  const idle=setInterval(()=>{if(document.visibilityState==='visible')setPose(p=>p==='happy'?p:p==='idle'?'rest':'idle')},18000)
  const retry=()=>navigator.serviceWorker?.ready.then(r=>r.active?.postMessage({type:'CACHE_COMPANION'})).catch(()=>{})
  retry();window.addEventListener('online',retry)
  return()=>{clearTimeout(reset.current);clearInterval(idle);window.removeEventListener('yl:pet',react);document.removeEventListener('visibilitychange',visible);window.removeEventListener('online',retry);stopSpeech()}
 },[])
 function remember(next){setPosition(next);try{localStorage.setItem('yangling:pet-position',JSON.stringify({x:bounds.x?next.x/bounds.x:0,y:bounds.y?next.y/bounds.y:0}))}catch{}}
 function hello(){if(performance.now()-lastClick.current<5000)return;lastClick.current=performance.now();speakPet('pet_hello_01').catch(()=>setMessage('我在呢，今天也陪你照顾好自己。'))}
 function down(e){if(e.button!==0)return;suppressClick.current=false;drag.current={id:e.pointerId,x:e.clientX,y:e.clientY,start:position,moved:false};e.currentTarget.setPointerCapture(e.pointerId)}
 function move(e){const d=drag.current;if(!d||d.id!==e.pointerId)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.hypot(dx,dy)>6)d.moved=true;if(d.moved)setPosition(clampPetPosition({x:d.start.x+dx,y:d.start.y+dy},bounds.x,bounds.y))}
 function up(e){const d=drag.current;if(!d||d.id!==e.pointerId)return;drag.current=null;suppressClick.current=d.moved;if(d.moved){remember(clampPetPosition({x:d.start.x+e.clientX-d.x,y:d.start.y+e.clientY-d.y},bounds.x,bounds.y));lastClick.current=performance.now()}e.currentTarget.releasePointerCapture(e.pointerId)}
 function keys(e){const delta={ArrowLeft:[-20,0],ArrowRight:[20,0],ArrowUp:[0,-20],ArrowDown:[0,20]}[e.key];if(delta){e.preventDefault();remember(clampPetPosition({x:position.x+delta[0],y:position.y+delta[1]},bounds.x,bounds.y))}}
 return <div ref={host} className="yl-pet-layer" hidden={hidden||blocked||!ready}>
  <div className={`yl-pet ${minimized?'minimized':''} ${pose}`} style={{left:position.x,top:position.y}}>
   {!minimized&&message&&<div className={`yl-pet-bubble ${position.x<150?'bubble-right':''}`} style={position.y<140?{top:120,bottom:'auto'}:undefined} role="status">{message}<small>今天已完成 {completed.length}/3 项</small></div>}
   <button className="yl-pet-body" aria-label={minimized?'展开小芽':'小芽，点击互动，拖动可移动'} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={()=>{drag.current=null;suppressClick.current=true}} onKeyDown={keys} onClick={()=>{if(suppressClick.current){suppressClick.current=false;return}minimized?setMinimized(false):hello()}}>
    <img src={`${import.meta.env.BASE_URL}pet/${images[pose]}`} alt="小芽" draggable="false"/>
   </button>
   {!minimized&&<button className="yl-pet-minimize" aria-label="收起小芽" onClick={()=>{setMinimized(true);setMessage('');stopSpeech()}}><Minus size={16}/></button>}
  </div>
 </div>
}
