import React,{useEffect,useState} from 'react'
export default function LaunchCover(){
  const [visible,setVisible]=useState(()=>!location.hash.includes('admin')&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(()=>{if(!visible)return;const app=document.querySelector('.ylm-app');if(app)app.inert=true;const timer=setTimeout(()=>setVisible(false),1500);return()=>{clearTimeout(timer);if(app)app.inert=false}},[visible])
  if(!visible)return null
  return <div className="yl-launch" role="dialog" aria-modal="true" aria-label="欢迎来到养令"><button onClick={()=>setVisible(false)}>跳过</button><div><svg viewBox="0 0 40 40" width="130" height="130" fill="none" stroke="#8b6d39" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="yl-launch-ring" pathLength="1" d="M11 5C5 10 4 24 14 30c8 5 18 0 19-9-3 6-11 8-16 3-5-5-2-11 3-16"/><g className="yl-launch-leaf"><path d="M21 5c-2 6-7 9-6 14 1 6 10 6 12 0 1-5-3-8-6-14Z"/><path d="M20 22v7"/></g></svg><div className="yl-launch-name"><strong>养令</strong><span>YangLing</span><p>一杯 · 一动 · 一息</p></div></div></div>
}
