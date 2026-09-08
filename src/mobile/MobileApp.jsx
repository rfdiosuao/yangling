import React,{useEffect,useState} from 'react'
import {Bell} from '@phosphor-icons/react'
import {loadConfig,saveConfig,CONFIG_KEY} from './config.js'
import {fetchPublicConfig} from './service.js'
import {parseMobileRoute} from './route.js'
import {loadAlias,saveAlias,loadReminder,saveReminder,ensureNotificationPermission,showLocalNotification,addTodaySeconds} from './reminder.js'
import {reminderSlots,reminderMessage} from './reminder-schedule.js'
import {isAndroidApp,syncNativeReminder,listenForReminder} from './native-notifications.js'
import BrandIcon from './BrandIcons.jsx'
import {Sheet} from './controls.jsx'
import HomeScreen from './HomeScreen.jsx'
import KnowledgeScreen from './KnowledgeScreen.jsx'
import MotionScreen from './MotionScreen.jsx'
import ReminderSettings from './ReminderSettings.jsx'
import AdminPanel from './AdminPanel.jsx'
import './mobile.css'
import './native-layout.css'
import './experience.css'

export default function MobileApp(){
  const initial=parseMobileRoute(location.hash)
  const [tab,setTab]=useState(initial.tab),[admin,setAdmin]=useState(initial.admin),[mode,setMode]=useState(()=>localStorage.getItem('yangling:mode')||'child')
  const [config,setConfig]=useState(loadConfig),[toast,setToast]=useState(''),[completed,setCompleted]=useState([]),[reminderOpen,setReminderOpen]=useState(false),[reminder,setReminder]=useState(loadReminder),[alias,setAlias]=useState(loadAlias),[ritual,setRitual]=useState(null)
  useEffect(()=>{const old=localStorage.getItem(CONFIG_KEY);if(old&&!localStorage.getItem('yangling:pre-server-config'))localStorage.setItem('yangling:pre-server-config',old)},[])
  useEffect(()=>{let alive=true;const refresh=()=>fetchPublicConfig().then(value=>{if(alive)setConfig(saveConfig({...value,dialect:localStorage.getItem('yangling:dialect')||value.dialect}))}).catch(()=>{});refresh();const focus=()=>{if(document.visibilityState==='visible')refresh()};document.addEventListener('visibilitychange',focus);return()=>{alive=false;document.removeEventListener('visibilitychange',focus)}},[])
  useEffect(()=>{const route=()=>{const next=parseMobileRoute(location.hash);setTab(next.tab);setAdmin(next.admin)};window.addEventListener('hashchange',route);window.addEventListener('popstate',route);return()=>{window.removeEventListener('hashchange',route);window.removeEventListener('popstate',route)}},[])
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),5000);return()=>clearTimeout(timer)},[toast])
  function navigate(next){setRitual(null);setTab(next);history.pushState(null,'','#'+next)}
  function openReminder(extra={}){navigate(extra.route==='motion'?'motion':'home');setRitual(extra.ritual||null)}
  useEffect(()=>{
    if(isAndroidApp()){
      syncNativeReminder(reminder,alias).catch(()=>setToast('请检查养生提醒设置。'))
      const handle=listenForReminder(openReminder);return()=>handle.then(h=>h.remove()).catch(()=>{})
    }
    const timer=setInterval(()=>{
      if(document.visibilityState==='visible')addTodaySeconds(15)
      const now=new Date(),time=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,slots=reminderSlots(reminder),index=slots.indexOf(time)
      const key=`${now.toDateString()}-${time}`
      if(index<0||localStorage.getItem('yangling:last-slot')===key)return
      const msg=reminderMessage(reminder,alias,index);if(showLocalNotification(msg.title,msg.body,{onClick:()=>openReminder(msg)}))localStorage.setItem('yangling:last-slot',key)
    },15000);return()=>clearInterval(timer)
  },[reminder,alias])
  async function updateReminder(next,name){
    if(isAndroidApp()){
      const permission=await syncNativeReminder(next,name,{request:next.enabled})
      if(next.enabled&&permission!=='granted')throw new Error('通知未开启，请到手机设置中允许养令通知，再保存。')
    }else if(next.enabled){if(await ensureNotificationPermission()!=='granted')throw new Error('通知未开启，请在浏览器设置中允许通知。');setToast('已保存。网页提醒需要保持页面打开。')}
    setAlias(saveAlias(name));setReminder(saveReminder(next))
  }
  function dialect(value){localStorage.setItem('yangling:dialect',value);setConfig(c=>({...c,dialect:value}))}
  const complete=type=>setCompleted(items=>items.includes(type)?items:[...items,type])
  return <div className="ylm-stage"><div className={`ylm-app ${mode==='parent'?'parent-mode':''}`} data-testid="mobile-app"><div className="ylm-scroll">
    <header className="ylm-header"><button className="ylm-brand" aria-label="养令首页" onClick={()=>navigate('home')}><BrandIcon name="brand" className="yl-brand-mark" size={39}/><span className="ylm-brand-copy"><b>养令</b><small>YangLing</small></span></button><div className="ylm-header-tools"><div className="ylm-mode" role="group" aria-label="使用模式">{['child','parent'].map(m=><button key={m} aria-pressed={mode===m} className={mode===m?'active':''} onClick={()=>{setMode(m);localStorage.setItem('yangling:mode',m)}}>{m==='child'?'儿女版':'家长版'}</button>)}</div><button className="ylm-reminder-trigger" aria-label="养生提醒设置" onClick={()=>setReminderOpen(true)}><Bell size={21} weight={reminder.enabled?'fill':'regular'}/></button></div></header>
    {tab==='home'&&<HomeScreen config={config} mode={mode} notify={setToast} completed={completed} onComplete={complete} onMove={()=>navigate('motion')} initialRitual={ritual}/>}
    {tab==='knowledge'&&<KnowledgeScreen config={config} mode={mode} notify={setToast} onDialect={dialect}/>}
    {tab==='motion'&&<MotionScreen courses={config.courses} mode={mode} notify={setToast} onComplete={complete}/>}
    </div><nav className="ylm-bottom-nav" aria-label="主导航">{[['home','轻养生','养生'],['knowledge','问答知识库','问一问'],['motion','动作识别','跟着练']].map(([key,label,parent])=><button key={key} aria-current={tab===key?'page':undefined} className={tab===key?'active':''} onClick={()=>navigate(key)}><BrandIcon name={key} size={27}/><span>{mode==='parent'?parent:label}</span></button>)}</nav>
    {toast&&<div className="ylm-toast" role="status">{toast}</div>}
    {admin&&<AdminPanel config={config} onSave={next=>{setConfig(saveConfig(next));setToast('配置已发布到网站与 App。')}} onClose={()=>{setAdmin(false);history.replaceState(null,'','#'+tab)}}/>}
    {reminderOpen&&<Sheet title="养生提醒" onClose={()=>setReminderOpen(false)}><ReminderSettings reminder={reminder} alias={alias} onSave={updateReminder} onClose={()=>setReminderOpen(false)}/></Sheet>}
  </div></div>
}
