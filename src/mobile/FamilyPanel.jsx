import React,{useEffect,useState} from 'react'
import {apiUrl} from './service.js'
import {localDate} from './companion.js'
import {readGrowth} from './growth.js'
const KEY='yangling:family-token'
export async function familyRequest(action,input={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000)
 try{const response=await fetch(apiUrl('/api/family/'+action),{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${localStorage.getItem(KEY)||''}`},body:JSON.stringify(input),signal:controller.signal});const data=await response.json();if(!response.ok)throw new Error(data.error||'连接失败');return data}finally{clearTimeout(timer)}
}
export async function syncFamily(){if(!localStorage.getItem(KEY))return;const date=localDate();await familyRequest('sync',{date,items:readGrowth().days[date]||[]})}
export default function FamilyPanel(){
 const [enabled,setEnabled]=useState(()=>Boolean(localStorage.getItem(KEY))),[state,setState]=useState(null),[name,setName]=useState(''),[code,setCode]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[texts,setTexts]=useState({}),[ids,setIds]=useState({})
 async function refresh(){await syncFamily();setState(await familyRequest('state'))}
 useEffect(()=>{if(!enabled)return;let alive=true;const load=()=>{if(document.visibilityState==='visible')syncFamily().then(()=>familyRequest('state')).then(x=>{if(alive){setState(x);setError('')}}).catch(()=>{if(alive){setState(null);setError('暂时无法连接，请联网后刷新。')}})};load();const timer=setInterval(load,30000);document.addEventListener('visibilitychange',load);return()=>{alive=false;clearInterval(timer);document.removeEventListener('visibilitychange',load)}},[enabled])
 async function run(fn){setBusy(true);setError('');try{await fn()}catch(e){setError(e.name==='AbortError'?'请求超时，请重试':e.message)}finally{setBusy(false)}}
 return <section className="yl-growth"><h3>家庭陪伴</h3><p>双方确认后共享每日打卡，不共享问答和身体状态。家人打开养令后可看到留言。</p>{error&&<p role="alert">{error}</p>}
 {!enabled?<form onSubmit={e=>{e.preventDefault();run(async()=>{const value=await familyRequest('register',{name});localStorage.setItem(KEY,value.token);setEnabled(true)})}}><label>我的昵称<input value={name} maxLength={24} onChange={e=>setName(e.target.value)} required/></label><button disabled={busy}>开启家庭陪伴</button><small>身份保存在本机，清除应用数据后需要重新绑定。</small></form>:<>
 <button disabled={busy} onClick={()=>run(refresh)}>刷新家人动态</button>
 {state&&<><p>你好，{state.name}</p><button disabled={busy} onClick={()=>run(async()=>{await familyRequest('invite');await refresh()})}>生成邀请码</button>{state.invite&&<p>邀请码：<strong>{state.invite}</strong><br/><small>10 分钟有效，请发给家人。</small></p>}
 <form onSubmit={e=>{e.preventDefault();run(async()=>{await familyRequest('join',{code});setCode('');await refresh()})}}><label>家人的邀请码<input value={code} onChange={e=>setCode(e.target.value)} maxLength={12} required autoCapitalize="characters"/></label><button disabled={busy}>同意共享并申请绑定</button></form>
 {!state.links.length&&<p>还没有绑定家人，邀请一位家人一起坚持吧。</p>}
 {state.links.map(link=><article key={link.id}><h3>{link.peer}</h3>{link.status==='pending'?<><p>{link.mine?'对方申请与你绑定':'等待家人确认'}</p>{link.mine&&<button disabled={busy} onClick={()=>run(async()=>{await familyRequest('confirm',{link:link.id});await refresh()})}>同意共享并绑定</button>}</>:<>
 <p>{link.summary?`${link.summary.date} · 已完成 ${link.summary.items.length}/3 项`:'家人还未同步打卡'}</p>{link.summary&&<small>{link.summary.items.map(x=>({cup:'一杯',move:'一动',breath:'一息'}[x])).join(' · ')||'今天还没打卡'}<br/>更新于 {new Date(link.summary.updated).toLocaleString()}</small>}
 <div className="yl-family-messages">{link.messages.map(m=><p key={m.id}><b>{m.mine?'我':link.peer}：</b>{m.text}<small>{new Date(m.at).toLocaleString()} · {m.mine?(m.read?'已读':'待查看'):(m.read?'已读':'未读')}</small></p>)}</div>
 {link.messages.some(m=>!m.mine&&!m.read)&&<button disabled={busy} onClick={()=>run(async()=>{await familyRequest('read',{link:link.id});await refresh()})}>标为已读</button>}
 <button onClick={()=>setTexts(t=>({...t,[link.id]:'今天也照顾好自己，一起活动一下吧！'}))}>送一句鼓励</button>
 <form onSubmit={e=>{e.preventDefault();const messageId=ids[link.id]||crypto.randomUUID();setIds(v=>({...v,[link.id]:messageId}));run(async()=>{await familyRequest('message',{link:link.id,text:texts[link.id],id:messageId});setTexts(v=>({...v,[link.id]:''}));setIds(v=>({...v,[link.id]:null}));await refresh()})}}><label>给家人留言<input maxLength={120} value={texts[link.id]||''} onChange={e=>{setTexts(v=>({...v,[link.id]:e.target.value}));setIds(v=>({...v,[link.id]:null}))}} required/></label><button disabled={busy}>发送留言</button></form>
 </>}<button disabled={busy} onClick={()=>{if(window.confirm('解除后停止共享，并删除这段关系的留言，确定吗？'))run(async()=>{await familyRequest('remove',{link:link.id});await refresh()})}}>{link.status==='pending'?'取消 / 拒绝请求':'解除绑定'}</button></article>)}
 </>}
 </>}
 </section>
}
