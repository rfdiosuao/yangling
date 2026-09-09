import {Capacitor,registerPlugin} from '@capacitor/core'
import {CUES,cueUrl,petEvent} from './companion.js'
const NativeSpeech=registerPlugin('YangLingSpeech')
let webFinish=null
let sequence=0
let clip=null,clipFinish=null
export function stopSpeech(){
  sequence++
  clip?.pause();clip=null;clipFinish?.();clipFinish=null
  if(Capacitor.getPlatform()==='android')return NativeSpeech.stop().catch(()=>{})
  globalThis.speechSynthesis?.cancel();webFinish?.();webFinish=null
  return Promise.resolve()
}
export async function speak(text,{audioUrl}={}){
  const stopped=stopSpeech(),ticket=sequence
  await stopped
  if(ticket!==sequence)return
  globalThis.dispatchEvent?.(new Event('yl:before-speech'))
  const clean=String(text||'').replace(/\[\d+\]/g,'').replace(/[*#]/g,'').slice(0,1600)
  if(!clean)return
  if(audioUrl){
    try{
      await new Promise((resolve,reject)=>{
        const audio=new Audio(audioUrl);clip=audio
        const timer=setTimeout(()=>finish(new Error('录音播放超时')),15000)
        function finish(error){clearTimeout(timer);audio.onended=null;audio.onerror=null;audio.pause();if(clip===audio){clip=null;clipFinish=null}error?reject(error):resolve()}
        clipFinish=()=>finish();audio.onended=()=>finish();audio.onerror=()=>finish(new Error('录音暂不可用'))
        audio.play().catch(finish)
      })
      return
    }catch{if(ticket!==sequence)return}
  }
  if(ticket!==sequence)return
  if(Capacitor.getPlatform()==='android')return NativeSpeech.speak({text:clean})
  if(!globalThis.speechSynthesis)throw new Error('此设备暂不支持朗读')
  return new Promise((resolve,reject)=>{
    const utterance=new SpeechSynthesisUtterance(clean);utterance.lang='zh-CN';utterance.rate=.9
    webFinish=resolve;utterance.onend=()=>{webFinish=null;resolve()};utterance.onerror=e=>{webFinish=null;e.error==='canceled'||e.error==='interrupted'?resolve():reject(new Error('语音暂不可用'))}
    speechSynthesis.speak(utterance)
  })
}
export function speakPet(id){if(!CUES[id])return Promise.resolve();petEvent(id);return speak(CUES[id],{audioUrl:cueUrl(id)})}
