import React,{useEffect,useRef,useState} from 'react'
import {Bell} from '@phosphor-icons/react'
import {loadConfig,saveConfig,CONFIG_KEY} from './config.js'
import {fetchPublicConfig} from './service.js'
import {parseMobileRoute} from './route.js'
import {loadAlias,saveAlias,loadReminder,saveReminder,ensureNotificationPermission,showLocalNotification,addTodaySeconds} from './reminder.js'
import {reminderSlots,reminderMessage} from './reminder-schedule.js'
import {isAndroidApp,syncNativeReminder,listenForReminder,nativePermission} from './native-notifications.js'
import BrandIcon from './BrandIcons.jsx'
import {Sheet} from './controls.jsx'
import HomeScreen from './HomeScreen.jsx'
import KnowledgeScreen from './KnowledgeScreen.jsx'
import MotionScreen from './MotionScreen.jsx'
import ReminderSettings from './ReminderSettings.jsx'
import AdminPanel from './AdminPanel.jsx'
import LaunchCover from './LaunchCover.jsx'
import PetCompanion from './PetCompanion.jsx'
import GrowthPanel from './GrowthPanel.jsx'
import {readGrowth,recordGrowth,growthStats,GROWTH_KEY} from './growth.js'
import {syncFamily} from './FamilyPanel.jsx'
import {loadCompletion,recordCompletion,localDate} from './companion.js'
import {speakPet,stopSpeech} from './speech.js'
import './mobile.css'
import './native-layout.css'
import './experience.css'

export default function MobileApp(){
  const initial=parseMobileRoute(location.hash)
  const [tab,setTab]=useState(initial.tab),[admin,setAdmin]=useState(initial.admin),[mode,setMode]=useState(()=>localStorage.getItem('yangling:mode')||'child')
  const [config,setConfig]=useState(loadConfig),[toast,setToast]=useState(''),[completed,setCompleted]=useState(()=>loadCompletion().items),[reminderOpen,setReminderOpen]=useState(false),[reminder,setReminder]=useState(loadReminder),[alias,setAlias]=useState(loadAlias),[ritual,setRitual]=useState(null)
  const daily=useRef(loadCompletion()),[reward,setReward]=useState(null)
  const [growth,setGrowth]=useState(readGrowth),[growthOpen,setGrowthOpen]=useState(false)
  const stats=growthStats(growth)
  useEffect(()=>{const refresh=()=>{if(document.visibilityState==='visible')syncFamily().catch(()=>{})};refresh();document.addEventListener('visibilitychange',refresh);return()=>document.removeEventListener('visibilitychange',refresh)},[])
  useEffect(()=>{if(!reward)return;const timer=setTimeout(()=>speakPet(reward.id).catch(()=>{}),0);return()=>clearTimeout(timer)},[reward])
  useEffect(()=>{const refresh=()=>{if(daily.current.date!==localDate()){daily.current=loadCompletion();setCompleted(daily.current.items)}};const timer=setInterval(refresh,30000);window.addEventListener('focus',refresh);return()=>{clearInterval(timer);window.removeEventListener('focus',refresh)}},[])
  const [notificationPermission,setNotificationPermission]=useState(null)
  useEffect(()=>{if(!isAndroidApp())return;const check=()=>nativePermission().then(setNotificationPermission).catch(()=>{});check();const visible=()=>{if(document.visibilityState==='visible')check()};document.addEventListener('visibilitychange',visible);return()=>document.removeEventListener('visibilitychange',visible)},[reminderOpen])
  useEffect(()=>{const old=localStorage.getItem(CONFIG_KEY);if(old&&!localStorage.getItem('yangling:pre-server-config'))localStorage.setItem('yangling:pre-server-config',old)},[])
  useEffect(()=>{let alive=true;const refresh=()=>fetchPublicConfig().then(value=>{if(alive)setConfig(saveConfig({...value,dialect:localStorage.getItem('yangling:dialect')||value.dialect}))}).catch(()=>{});refresh();const focus=()=>{if(document.visibilityState==='visible')refresh()};document.addEventListener('visibilitychange',focus);return()=>{alive=false;document.removeEventListener('visibilitychange',focus)}},[])
  useEffect(()=>{const route=()=>{const next=parseMobileRoute(location.hash);setTab(next.tab);setAdmin(next.admin)};window.addEventListener('hashchange',route);window.addEventListener('popstate',route);return()=>{window.removeEventListener('hashchange',route);window.removeEventListener('popstate',route)}},[])
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),5000);return()=>clearTimeout(timer)},[toast])
  function navigate(next){stopSpeech();setRitual(null);setTab(next);history.pushState(null,'','#'+next)}
  useEffect(()=>{if(!isAndroidApp())return;const timer=setInterval(()=>{if(document.visibilityState==='visible')addTodaySeconds(15)},15000);return()=>clearInterval(timer)},[])
  function openReminder(extra={}){navigate(extra.route==='motion'?'motion':'home');setRitual(extra.ritual?{type:extra.ritual,id:Date.now()}:null)}
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
      if(permission!=='disabled')setNotificationPermission(permission)
      if(next.enabled&&permission!=='granted')throw new Error('通知未开启，请到手机设置中允许养令通知，再保存。')
    }else if(next.enabled){if(await ensureNotificationPermission()!=='granted')throw new Error('通知未开启，请在浏览器设置中允许通知。');setToast('已保存。网页提醒需要保持页面打开。')}
    setAlias(saveAlias(name));setReminder(saveReminder(next))
  }
  function dialect(value){localStorage.setItem('yangling:dialect',value);setConfig(c=>({...c,dialect:value}))}
  const complete=type=>{const next=recordCompletion(daily.current,type),old=readGrowth(),history=recordGrowth(old,type);try{localStorage.setItem(GROWTH_KEY,JSON.stringify(history))}catch{setToast('本机空间不足，打卡未保存，请清理空间后重试。');return}daily.current=next.record;setCompleted(next.record.items);setGrowth(history);try{localStorage.setItem('yangling:pet-completed',JSON.stringify(next.record))}catch{}if(growthStats(history).stage.days>growthStats(old).stage.days)setToast(`小芽长大啦！已解锁${growthStats(history).stage.name}。`);if(next.cue)setReward({id:next.cue,time:Date.now()});syncFamily().catch(()=>{})}
  return <div className="ylm-stage"><div className={`ylm-app ${mode==='parent'?'parent-mode':''}`} data-testid="mobile-app"><div className="ylm-scroll">
    <header className="ylm-header"><button className="ylm-brand" aria-label="养令首页" onClick={()=>navigate('home')}><BrandIcon name="brand" className="yl-brand-mark" size={39}/><span className="ylm-brand-copy"><b>养令</b><small>YangLing</small></span></button><div className="ylm-header-tools"><div className="ylm-mode" role="group" aria-label="使用模式">{['child','parent'].map(m=><button key={m} aria-pressed={mode===m} className={mode===m?'active':''} onClick={()=>{setMode(m);localStorage.setItem('yangling:mode',m)}}>{m==='child'?'儿女版':'家长版'}</button>)}</div><button className="ylm-reminder-trigger" aria-label="养生提醒设置" onClick={()=>setReminderOpen(true)}><Bell size={21} weight={reminder.enabled?'fill':'regular'}/></button></div></header>
    {tab==='home'&&<><button className="yl-growth-entry" onClick={()=>setGrowthOpen(true)}>{stats.stage.name} · 已陪伴 {stats.total} 天 · 今日 {completed.length}/3　查看成长与家人 ›</button><HomeScreen config={config} mode={mode} notify={setToast} completed={completed} onComplete={complete} onMove={()=>navigate('motion')} initialRitual={ritual}/></>}
    {tab==='knowledge'&&<KnowledgeScreen config={config} mode={mode} notify={setToast} onDialect={dialect}/>}
    {tab==='motion'&&<MotionScreen courses={config.courses} mode={mode} notify={setToast} onComplete={complete}/>}
    </div><nav className="ylm-bottom-nav" aria-label="主导航">{[['home','轻养生','养生'],['knowledge','问答知识库','问一问'],['motion','动作识别','跟着练']].map(([key,label,parent])=><button key={key} aria-current={tab===key?'page':undefined} className={tab===key?'active':''} onClick={()=>navigate(key)}><BrandIcon name={key} size={27}/><span>{mode==='parent'?parent:label}</span></button>)}</nav>
    <PetCompanion completed={completed} stage={stats.stage} hidden={admin||reminderOpen||growthOpen}/>
    {growthOpen&&<Sheet title="小芽与家人" onClose={()=>setGrowthOpen(false)}><GrowthPanel history={growth}/></Sheet>}
    {toast&&<div className="ylm-toast" role="status">{toast}</div>}
    {admin&&<AdminPanel config={config} onSave={next=>{setConfig(saveConfig(next));setToast('配置已发布到网站与 App。')}} onClose={()=>{setAdmin(false);history.replaceState(null,'','#'+tab)}}/>}
    {reminderOpen&&<Sheet title="养生提醒" onClose={()=>setReminderOpen(false)}><ReminderSettings reminder={reminder} alias={alias} mode={mode} permission={notificationPermission} onSave={updateReminder} onClose={()=>setReminderOpen(false)}/></Sheet>}
  </div><LaunchCover/></div>
}
