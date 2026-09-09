import {Capacitor,registerPlugin} from '@capacitor/core'
const NativeSpeech=registerPlugin('YangLingSpeech')
let webFinish=null
let sequence=0
export function stopSpeech(){
  sequence++
  if(Capacitor.getPlatform()==='android')return NativeSpeech.stop().catch(()=>{})
  globalThis.speechSynthesis?.cancel();webFinish?.();webFinish=null
  return Promise.resolve()
}
export async function speak(text){
  const stopped=stopSpeech(),ticket=sequence
  await stopped
  if(ticket!==sequence)return
  globalThis.dispatchEvent?.(new Event('yl:before-speech'))
  const clean=String(text||'').replace(/\[\d+\]/g,'').replace(/[*#]/g,'').slice(0,1600)
  if(!clean)return
  if(Capacitor.getPlatform()==='android')return NativeSpeech.speak({text:clean})
  if(!globalThis.speechSynthesis)throw new Error('此设备暂不支持朗读')
  return new Promise((resolve,reject)=>{
    const utterance=new SpeechSynthesisUtterance(clean);utterance.lang='zh-CN';utterance.rate=.9
    webFinish=resolve;utterance.onend=()=>{webFinish=null;resolve()};utterance.onerror=e=>{webFinish=null;e.error==='canceled'||e.error==='interrupted'?resolve():reject(new Error('语音暂不可用'))}
    speechSynthesis.speak(utterance)
  })
}
