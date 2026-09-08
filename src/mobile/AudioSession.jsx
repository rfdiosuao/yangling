import React,{useEffect,useRef,useState} from 'react'
import {selectAudio} from './audio-library.js'
import BrandIcon from './BrandIcons.jsx'

export default function AudioSession({tracks=[],onComplete}) {
  const [track,setTrack]=useState(()=>selectAudio(tracks)),[history,setHistory]=useState([])
  const [running,setRunning]=useState(false),[seconds,setSeconds]=useState(0),[volume,setVolume]=useState(.5),[error,setError]=useState('')
  const player=useRef(null),done=useRef(false)
  useEffect(()=>{if(player.current)player.current.volume=volume},[volume,track])
  useEffect(()=>{
    if(!running)return
    const timer=setInterval(()=>setSeconds(s=>Math.min(180,s+1)),1000)
    return ()=>clearInterval(timer)
  },[running])
  useEffect(()=>{
    if(seconds>=175&&player.current)player.current.volume=volume*Math.max(0,(180-seconds)/5)
    if(seconds>=180){setRunning(false);player.current?.pause();if(!done.current){done.current=true;onComplete()}}
  },[seconds,volume])
  useEffect(()=>{const audio=player.current;return ()=>{audio?.pause();audio?.removeAttribute('src');audio?.load()}},[])
  function toggle(){
    if(running){player.current?.pause();setRunning(false);return}
    if(seconds>=180){done.current=false;setSeconds(0);if(player.current){player.current.currentTime=0;player.current.volume=volume}}
    setRunning(true)
    if(track)player.current?.play().catch(()=>setError('音乐暂时无法播放，可换一段或无音乐继续。'))
  }
  function change(){
    player.current?.pause();setRunning(false);setError('')
    const seen=[...history,track?.id].filter(Boolean),next=selectAudio(tracks,seen)
    setHistory(tracks.filter(t=>t.enabled!==false&&t.url).every(t=>seen.includes(t.id))?[track?.id]:seen)
    setTrack(next)
  }
  return <div className="yl-audio-session">
    <div className={`yl-breath-ring ${running?'running':''}`}><BrandIcon name="breath" size={65}/></div>
    <h3>{seconds>=180?'这一刻，留给自己':running?(seconds%10<4?'轻轻吸气':'慢慢呼气'):'跟着自己的节奏'}</h3>
    <p className="yl-timer">{Math.floor((180-seconds)/60)}:{String((180-seconds)%60).padStart(2,'0')}</p>
    <div className="yl-audio-track"><span>{track?.name||'无音乐 · 自然呼吸'}</span><button onClick={change} disabled={tracks.filter(t=>t.enabled!==false&&t.url).length<2}>换一段</button></div>
    {track&&<audio ref={player} src={track.url} preload="metadata" onError={()=>setError('这段音频暂时无法播放，可换一段或继续呼吸。')}/>}
    {track&&<label className="yl-volume">音量<input aria-label="音乐音量" type="range" min="0" max="1" step="0.05" value={volume} onChange={e=>setVolume(Number(e.target.value))}/></label>}
    {error&&<p role="status">{error}</p>}
    <button className="ylm-primary" onClick={toggle}>{running?'暂停一下':seconds>=180?'再放松三分钟':seconds?'继续放松':'开始三分钟'}</button>
  </div>
}
