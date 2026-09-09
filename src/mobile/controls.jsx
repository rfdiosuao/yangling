import React,{useEffect,useRef,useState} from 'react'
import {Microphone,X} from '@phosphor-icons/react'
import {DIALECTS} from './config.js'
export function Sheet({title,children,onClose}){
  const ref=useRef(null)
  useEffect(()=>{
    const old=document.activeElement;ref.current?.focus()
    const key=e=>{if(e.key==='Escape')onClose();if(e.key==='Tab'){
      const els=[...ref.current.querySelectorAll('button,a,input,textarea,select,summary,[tabindex="0"]')].filter(el=>!el.disabled&&el.getClientRects().length)
      if(!els.length)return
      if(e.shiftKey&&document.activeElement===els[0]){e.preventDefault();els.at(-1).focus()}
      else if(!e.shiftKey&&document.activeElement===els.at(-1)){e.preventDefault();els[0].focus()}
    }}
    document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);old?.focus()}
  },[])
  return <div className="ylm-overlay" onClick={onClose}><section className="ylm-sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref} onClick={e=>e.stopPropagation()}><header><h2>{title}</h2><button className="ylm-icon-btn" aria-label="关闭" onClick={onClose}><X size={24}/></button></header>{children}</section></div>
}
export function VoiceButton({onText,notify,dialect='mandarin',large=false}){
  const [listening,setListening]=useState(false),recognition=useRef(null)
  useEffect(()=>()=>recognition.current?.abort(),[])
  function listen(){
    if(listening){recognition.current?.stop();return}
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition
    if(!Recognition){notify('当前设备不支持此语音输入，可直接打字。');return}
    const rec=new Recognition();recognition.current=rec
    rec.lang=DIALECTS.find(d=>d.id===dialect)?.locale||'zh-CN';rec.interimResults=false
    rec.onstart=()=>setListening(true);rec.onend=()=>setListening(false)
    rec.onresult=e=>onText(e.results[0][0].transcript)
    rec.onerror=e=>{setListening(false);notify(e.error==='not-allowed'?'请允许麦克风权限，也可以直接打字。':'没有听清，请再说一次或打字。')}
    try{rec.start()}catch{notify('语音暂不可用，请直接打字。')}
  }
  return <button type="button" className={`${large?'yl-voice-large':'ylm-voice compact'} ${listening?'listening':''}`} aria-label={listening?'结束语音输入':'语音输入'} onClick={listen}><Microphone size={large?28:25}/>{(large||listening)&&<span role="status">{listening?(large?'正在听，点一下结束':'正在听'):'点一下，说问题'}</span>}</button>
}
