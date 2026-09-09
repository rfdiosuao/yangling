import React,{useEffect,useState} from 'react'
import {speak,stopSpeech} from './speech.js'
export default function ReadAloud({text,notify}){
  const [reading,setReading]=useState(false)
  useEffect(()=>{setReading(false);return()=>{stopSpeech()}},[text])
  async function toggle(){if(reading){setReading(false);await stopSpeech();return}setReading(true);try{await speak(text)}catch{notify('朗读暂不可用，请检查手机中文语音引擎。')}finally{setReading(false)}}
  return <button className="yl-listen" onClick={toggle}>{reading?'停止朗读':'听回答'}</button>
}
