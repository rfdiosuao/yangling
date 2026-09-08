import React, { useEffect, useRef, useState } from 'react'
import { Microphone, PaperPlaneTilt, ThumbsUp, ThumbsDown, FileText, CaretRight, Check, X, FlowerLotus, Camera, CameraSlash, LockSimple, WarningCircle, Play, CheckCircle, CircleNotch, VideoCamera, SpeakerHigh, SpeakerSlash, Bell, ArrowCounterClockwise } from '@phosphor-icons/react'
import { DEFAULT_QUESTION, QUESTIONS, STATES, EXERCISES, makeAnswer, makePlan, scorePose } from './model.js'
import { DIALECTS, findKnowledgeMatches, loadConfig, saveConfig, validateVideoUrl } from './config.js'
import { requestConfiguredLlm } from './llm.js'
import { startAmbient } from './ambient-audio.js'
import { parseMobileRoute } from './route.js'
import { generateAlias, loadAlias, saveAlias, loadReminder, saveReminder, loadTodaySeconds, addTodaySeconds, formatDuration, pickTemplate, ensureNotificationPermission, showLocalNotification, notificationSupported } from './reminder.js'
import { isAndroidApp, nativePermission, syncNativeReminder, testNativeNotification, listenForReminder } from './native-notifications.js'
import brandLogo from '../assets/seal-logo.png'
import AdminPanel from './AdminPanel.jsx'
import './mobile.css'
import './native-layout.css'

const INITIAL_CARDS = makePlan('').cards
const LAST_NOTIFY_KEY = 'yangling:last-notify:v1'

function Sheet({ title, children, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    const old = document.activeElement
    ref.current?.focus()
    const handle = e => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab') {
        const els = [...ref.current.querySelectorAll('button, a, input, [tabindex="0"]')].filter(el => !el.disabled)
        if (!els.length) return
        if (e.shiftKey && document.activeElement === els[0]) { e.preventDefault(); els.at(-1).focus() }
        else if (!e.shiftKey && document.activeElement === els.at(-1)) { e.preventDefault(); els[0].focus() }
      }
    }
    document.addEventListener('keydown', handle)
    return () => { document.removeEventListener('keydown', handle); old?.focus() }
  }, [])
  return <div className="ylm-overlay" onClick={onClose}><section className="ylm-sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref} onClick={e => e.stopPropagation()}><header><h2>{title}</h2><button className="ylm-icon-btn" aria-label="关闭" onClick={onClose}><X size={23}/></button></header>{children}</section></div>
}

function VoiceButton({ onText, notify, compact = false, dialect = 'mandarin' }) {
  const [listening, setListening] = useState(false)
  const recognition = useRef(null)
  useEffect(() => () => recognition.current?.abort(), [])
  function listen() {
    if (listening) { recognition.current?.stop(); return }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) { notify('当前浏览器暂未支持语音输入，请直接输入文字。'); return }
    const rec = new SpeechRecognition()
    recognition.current = rec
    rec.lang = DIALECTS.find(item => item.id === dialect)?.locale || 'zh-CN'; rec.interimResults = false
    rec.onstart = () => setListening(true)
    rec.onend = () => setListening(false)
    rec.onresult = e => { onText(e.results[0][0].transcript); setListening(false) }
    rec.onerror = e => { setListening(false); notify(e.error === 'not-allowed' ? '麦克风权限未开启，可以继续使用文字输入。' : '这次没有听清，请重试或输入文字。') }
    try { rec.start() } catch { notify('语音暂未连接，请使用文字输入。') }
  }
  return <button type="button" aria-label={listening ? '结束语音输入' : '语音输入'} className={`ylm-voice ${compact ? 'compact' : ''} ${listening ? 'listening' : ''}`} onClick={listen}><Microphone size={compact ? 26 : 30} weight="regular"/>{!compact && <span>{listening ? '正在聆听' : '点击说话'}</span>}</button>
}

function Home({ onMove, notify, completed, onComplete, dialect }) {
  const [text, setText] = useState('')
  const [plan, setPlan] = useState(null)
  const [selected, setSelected] = useState(null)
  const [running, setRunning] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [musicOn, setMusicOn] = useState(false)
  const ambient = useRef(null)
  useEffect(() => () => ambient.current?.stop(), [])
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [running])
  useEffect(() => {
    if (seconds >= 60 && running) { setRunning(false); onComplete('breath'); notify('这一刻的放松，已为你记下。') }
  }, [seconds, running])
  function generate(value = text) {
    if (!value.trim()) { notify('先说说你现在的感受吧。'); return }
    setText(value); setPlan(makePlan(value))
  }
  function stopMusic() { ambient.current?.stop(); ambient.current = null; setMusicOn(false) }
  function playMusic(type) { ambient.current?.stop(); ambient.current = startAmbient(type); setMusicOn(ambient.current.supported); if (!ambient.current.supported) notify('当前浏览器暂未开放背景音乐。') }
  function openRitual(card) { playMusic(card.type); setSelected(card); setRunning(false); setSeconds(0) }
  const cards = plan?.cards || INITIAL_CARDS
  return <main className="ylm-page ylm-home">
    <section className="ylm-home-intro"><h1>今天感觉怎么样？</h1>
    <p className="ylm-subtitle">说说你的状态，我们为你提供简单的养生建议。</p>
    <form className="ylm-state-input" onSubmit={e => { e.preventDefault(); generate() }}>
      <input aria-label="输入你现在的感受" placeholder="输入你现在的感受……" value={text} onChange={e => setText(e.target.value)} />
      <div className="ylm-state-action">{text.trim() ? <button className="ylm-send-state" type="submit" aria-label="生成今日养生建议"><PaperPlaneTilt size={27}/><span>生成建议</span></button> : <VoiceButton onText={setText} notify={notify} dialect={dialect}/>}</div>
    </form>
    <div className="ylm-state-chips">{STATES.map(s => <button key={s} className={`ylm-chip ${text === s ? 'selected' : ''}`} onClick={() => generate(s)}>{s}</button>)}</div></section>
    {plan && <p className={`ylm-plan-message ${plan.urgent ? 'urgent' : ''}`} role="status">{plan.message}</p>}
    {!plan?.urgent && <div className="ylm-rituals">{cards.map(card => <button key={card.type} className={`ylm-ritual ${completed.includes(card.type) ? 'done' : ''}`} onClick={() => openRitual(card)}><span className={`ylm-ritual-icon source-${card.type}`} aria-hidden="true"/><span><strong>{card.title}</strong><small>{completed.includes(card.type) ? '今日已完成，照顾好自己' : card.subtitle}</small></span>{completed.includes(card.type) && <CheckCircle className="ylm-done-icon" size={22}/>}</button>)}</div>}
    {selected && <Sheet title={selected.title + ' · ' + selected.subtitle} onClose={() => { setSelected(null); setRunning(false); stopMusic() }}>
      <p className="ylm-sheet-copy">{selected.detail}</p>
      <button className={`ylm-music-toggle ${musicOn ? 'playing' : ''}`} aria-pressed={musicOn} onClick={() => musicOn ? stopMusic() : playMusic(selected.type)}>{musicOn ? <SpeakerHigh size={21} weight="fill"/> : <SpeakerSlash size={21}/>}<span>{musicOn ? '舒缓音乐播放中' : '播放舒缓音乐'}</span></button>
      {selected.type === 'breath' && <div className="ylm-breath"><FlowerLotus size={86} weight="thin" className={running ? 'breathing' : ''}/><strong>{running ? (seconds % 10 < 4 ? '轻轻吸气' : '慢慢呼气') : seconds >= 60 ? '把这一刻留给自己' : '跟着自己的节奏'}</strong><span>{Math.max(0, 60-seconds)} 秒</span></div>}
      <button className="ylm-primary" onClick={() => {
        if (selected.type === 'move') { stopMusic(); setSelected(null); onMove(); return }
        if (selected.type === 'breath' && seconds < 60) { setRunning(!running); return }
        onComplete(selected.type); stopMusic(); setSelected(null); notify('今日打卡完成。')
      }}>{selected.type === 'breath' ? (seconds >= 60 ? '完成打卡' : running ? '暂停一下' : seconds ? '继续放松' : '开始放松') : selected.action}</button>
      {selected.type === 'breath' && <button className="ylm-text-button" onClick={() => { onComplete('breath'); stopMusic(); setSelected(null); setRunning(false) }}>已完成，记下这一刻</button>}
    </Sheet>}
  </main>
}

function Knowledge({ notify, config, onOpenAdmin }) {
  const [input, setInput] = useState('')
  const [question, setQuestion] = useState(DEFAULT_QUESTION)
  const [answer, setAnswer] = useState(() => makeAnswer(DEFAULT_QUESTION))
  const [feedback, setFeedback] = useState(null)
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  async function ask(q = input) {
    if (!q.trim()) { notify('输入一个你想了解的问题吧。'); return }
    clearTimeout(timer.current); setQuestion(q.trim()); setInput(''); setFeedback(null); setPending(true)
    const matches = findKnowledgeMatches(q, config.knowledge, 3)
    const localAnswer = matches.length ? {
      title: '根据知识库，可以这样做',
      lines: matches.flatMap(item => item.answer.split(/\n+/).filter(Boolean)).slice(0, 5),
      sources: matches.map(item => ({ title: item.source || item.title, body: item.answer, reviewed: item.reviewed !== false })),
    } : { title: '暂时没有找到可靠依据', lines: ['这个问题还没有匹配到已导入的知识条目。', '请换一种说法，或先让管理员导入对应的 JSON / Markdown 知识。'], sources: [], unmatched: true }
    try {
      if (matches.length && config.llm.apiKey && config.llm.baseUrl && config.llm.model) {
        const context = matches.map((item, index) => `[${index + 1}] ${item.title}\n${item.answer}\n来源：${item.source || item.title}`).join('\n\n')
        const lines = await requestConfiguredLlm(config.llm, q.trim(), context)
        setAnswer({ title: '基于知识库的回答', lines, sources: localAnswer.sources })
      } else {
        await new Promise(resolve => { timer.current = setTimeout(resolve, 350) })
        setAnswer(localAnswer)
      }
    } catch {
      setAnswer(localAnswer)
      notify('LLM 暂未响应，已回退到知识库原文。')
    } finally { setPending(false) }
  }
  return <main className="ylm-page ylm-knowledge">
    <h1>养生说法靠不靠谱？</h1>
    <p className="ylm-subtitle">提个问题，我们帮你查知识库，再给你简单回答。</p>
    <div className="ylm-dialect-row"><span>语音识别</span><select aria-label="选择语音方言" value={config.dialect} onChange={e => onOpenAdmin({ dialect: e.target.value })}>{DIALECTS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div>
    <form className="ylm-question-input" onSubmit={e => { e.preventDefault(); ask() }}><input aria-label="输入你想问的问题" placeholder="输入你想问的问题……" value={input} onChange={e => setInput(e.target.value)}/><VoiceButton compact onText={setInput} notify={notify} dialect={config.dialect}/><button className="ylm-send" aria-label="发送问题" type="submit" disabled={pending}><PaperPlaneTilt size={21} weight="fill"/></button></form>
    <div className="ylm-question-chips">{QUESTIONS.map(q => <button className="ylm-chip" key={q} onClick={() => ask(q)}>{q}</button>)}</div>
    <div className="ylm-user-message"><span className="ylm-user-avatar" aria-hidden="true"/><span>{question}</span></div>
    <section className={`ylm-answer ${answer.urgent ? 'urgent' : ''}`} aria-live="polite" aria-busy={pending}>
      <div className="ylm-answer-top"><span className="ylm-bot" aria-hidden="true"/><h2>{pending ? <CircleNotch size={23} className="spinning"/> : <CheckCircle size={25} weight="fill"/>}{pending ? '正在查找知识条目…' : answer.title}</h2></div>
      {!pending && <ol>{answer.lines.map((line, i) => <li key={line}>{line}{answer.sources[i] && <button className="ylm-citation" aria-label={`查看知识依据 ${i+1}`} onClick={() => setSourcesOpen(true)}>[{i+1}]</button>}</li>)}</ol>}
    </section>
    <button className="ylm-sources" onClick={() => setSourcesOpen(true)} disabled={pending}><FileText size={25}/><span>知识依据 <em>{answer.sources.length}条</em></span><CaretRight size={20}/></button>
    <div className="ylm-feedback"><span>{feedback ? '谢谢你的反馈' : '这条回答准吗？'}</span><button className={feedback === 'yes' ? 'selected' : ''} aria-pressed={feedback === 'yes'} onClick={() => setFeedback('yes')}><ThumbsUp size={21} weight={feedback === 'yes' ? 'fill' : 'regular'}/>有帮助</button><button className={feedback === 'no' ? 'selected' : ''} aria-pressed={feedback === 'no'} onClick={() => setFeedback('no')}><ThumbsDown size={21} weight={feedback === 'no' ? 'fill' : 'regular'}/>不太准</button></div>
    <p className="ylm-disclaimer">仅供日常养生信息参考，不替代医生诊断或治疗建议。</p>
    {sourcesOpen && <Sheet title="知识依据" onClose={() => setSourcesOpen(false)}><p className="ylm-source-note">以下为原型内置示例条目，正式版本需经医学审核并补充可核查的文献来源。</p>{answer.sources.length ? answer.sources.map((source, i) => <details className="ylm-source-detail" key={source.title} open><summary>[{i+1}] {source.title}</summary><p>{source.body}</p></details>) : <p className="ylm-sheet-copy">当前回答没有引用知识条目。</p>}</Sheet>}
  </main>
}

function Motion({ notify, onComplete, courses }) {
  const [exercise, setExercise] = useState(0)
  const [showGuide, setShowGuide] = useState(false)
  const [cameraState, setCameraState] = useState('off')
  const [result, setResult] = useState(null)
  const [detail, setDetail] = useState(false)
  const videoRef = useRef(null), canvasRef = useRef(null), streamRef = useRef(null), frameRef = useRef(null), generation = useRef(0), activeExercise = useRef(0)
  const exerciseData = EXERCISES[exercise]
  const course = courses.find(item => item.enabled && item.moveName === exerciseData.name)
  function stopCamera() {
    generation.current++
    cancelAnimationFrame(frameRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraState('off'); setResult(null)
  }
  useEffect(() => () => { generation.current++; cancelAnimationFrame(frameRef.current); streamRef.current?.getTracks().forEach(t => t.stop()) }, [])
  async function startCamera() {
    if (cameraState !== 'off') { stopCamera(); return }
    const current = ++generation.current
    setCameraState('loading')
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported')
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      if (current !== generation.current) { stream.getTracks().forEach(t => t.stop()); return }
      streamRef.current = stream
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      const pose = await import('../core/motion/pose-detector.js')
      const detector = await pose.getPoseLandmarker()
      if (current !== generation.current) return
      setCameraState('live')
      let last = 0
      const tick = time => {
        if (current !== generation.current) return
        if (time-last > 100 && videoRef.current?.readyState >= 2) {
          last = time
          try {
            const video = videoRef.current, canvas = canvasRef.current
            const points = pose.detectPose(detector, video, time)
            canvas.width = video.videoWidth; canvas.height = video.videoHeight
            if (points) pose.drawSkeleton(canvas, points)
            else canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height)
            setResult(scorePose(points, activeExercise.current))
          } catch { stopCamera(); notify('动作识别暂时中断，可以重试或查看示范。'); return }
        }
        frameRef.current = requestAnimationFrame(tick)
      }
      frameRef.current = requestAnimationFrame(tick)
    } catch(e) {
      if (current !== generation.current) return
      stopCamera()
      notify(e.name === 'NotAllowedError' ? '摄像头权限未开启，仍可查看标准示范。' : '摄像头或识别模型暂未就绪，仍可查看示范。')
    }
  }
  const isLive = cameraState === 'live'
  return <main className="ylm-page ylm-motion">
    <h1>跟着练，看看动作对不对</h1>
    <p className="ylm-subtitle">打开摄像头，AI帮你识别动作并及时提醒。</p>
    <div className="ylm-exercise-tabs" role="tablist" aria-label="选择练习动作">{EXERCISES.map((ex, i) => <button role="tab" aria-selected={exercise === i} className={`ylm-chip ${exercise === i ? 'selected' : ''}`} key={ex.name} onClick={() => { setExercise(i); activeExercise.current = i; setResult(null) }}>{ex.name}</button>)}</div>
    <div className={`ylm-camera-view ${cameraState !== 'off' ? 'camera-on' : ''}`}>
      <div className="ylm-demo-photo" role="img" aria-label="双手托天示范：穿浅色上衣的女士站立举起双臂，叠加姿态关键点" />
      <video ref={videoRef} muted playsInline aria-label="本机摄像头实时画面"/>
      <canvas ref={canvasRef} aria-hidden="true"/>
      <button className="ylm-camera-badge" onClick={startCamera} aria-label={cameraState === 'off' ? '开启摄像头' : '关闭摄像头'}>{cameraState === 'loading' ? <CircleNotch className="spinning" size={14}/> : cameraState === 'live' ? <CameraSlash size={15}/> : <Camera size={15}/>}<span>{cameraState === 'loading' ? '正在连接…' : cameraState === 'live' ? '摄像头已开启' : '示范画面 · 开启摄像头'}</span></button>
      {cameraState === 'off' && exercise !== 0 && <button className="ylm-guide-overlay" onClick={() => setShowGuide(true)}><Play size={18} weight="fill"/>查看{exerciseData.name}步骤</button>}
    </div>
    <button className="ylm-score" aria-label="查看动作评分详情" onClick={() => setDetail(!detail)} aria-expanded={detail}><span><strong>{cameraState === 'off' ? exerciseData.score : result?.score ?? '—'}</strong><em>{cameraState === 'off' || result ? '分' : ''}</em></span><small>{cameraState === 'off' ? '动作基本标准' : cameraState === 'loading' ? '正在准备动作识别' : result ? '实时动作参考评分' : '请让全身进入画面'}</small></button>
    <div className="ylm-motion-hint" role="status"><WarningCircle size={25} weight="fill"/><span>{cameraState === 'off' ? exerciseData.hint : result?.hint || '站远一点，让肩、手臂和腰部入镜'}</span></div>
    {detail && <div className="ylm-metrics">{[['手臂高度', result?.armGood], ['肩颈放松', result?.relaxed], ['腰背挺直', result?.aligned]].map(([label, ok], i) => <div key={label}><span>{label}</span><em>{cameraState === 'off' ? i ? '良好' : '需调整' : result ? ok ? '良好' : '需调整' : '待识别'}</em></div>)}<p>{cameraState === 'off' ? '当前分数为界面演示数据。开启摄像头后显示实际关键点计算结果。' : '评分仅反映关键点位置，作为练习参考。'}</p></div>}
    <div className="ylm-motion-actions"><button className="ylm-primary ylm-standard" onClick={() => setShowGuide(true)}>查看标准示范</button>{course && validateVideoUrl(course.videoUrl) && <a className="ylm-video-link" href={course.videoUrl} target="_blank" rel="noreferrer"><VideoCamera size={20}/>{course.name}视频</a>}</div>
    {isLive && <p className="ylm-camera-privacy"><LockSimple size={12}/>画面仅在本机处理，不上传保存。</p>}
    {showGuide && <Sheet title={exerciseData.name + ' · 标准示范'} onClose={() => setShowGuide(false)}>{exercise === 0 && <div className="ylm-guide-photo ylm-demo-photo" role="img" aria-label="双手托天参考动作"/>}<ol className="ylm-guide-steps">{exerciseData.steps.map(s => <li key={s}>{s}</li>)}</ol><p className="ylm-source-note">在舒适范围内练习，出现不适立即停止。示范分数仅用于原型演示。</p><button className="ylm-primary" onClick={() => { onComplete('move'); setShowGuide(false); notify('这次练习已完成，记得放松一下。') }}><Check size={20}/>完成本次练习</button></Sheet>}
  </main>
}

function ReminderSheet({ alias, onRollAlias, todaySeconds, reminder, onChange, notify, onClose }) {
  const native = isAndroidApp()
  const [permission, setPermission] = useState(() => native ? 'prompt' : (notificationSupported() ? Notification.permission : 'unsupported'))
  useEffect(() => {
    let alive = true
    if (native) nativePermission().then(value => { if (alive) setPermission(value) }).catch(() => { if (alive) setPermission('unsupported') })
    return () => { alive = false }
  }, [reminder.enabled])
  async function grant() {
    try {
      const result = native ? await nativePermission(true) : await ensureNotificationPermission()
      setPermission(result)
      if (result === 'granted') { if (reminder.enabled) await onChange(reminder); notify('通知权限已开启。') }
      else if (result !== 'unsupported') notify('未获得通知权限，提醒将不会弹出。')
    } catch { notify('请到系统设置中检查养令通知权限。') }
  }
  return <Sheet title="养生提醒" onClose={onClose}>
    <div className="ylm-reminder-alias">
      <div><span className="ylm-reminder-label">你的独特别称</span><strong className="ylm-reminder-name">{alias}</strong></div>
      <button className="ylm-reminder-roll" onClick={onRollAlias} aria-label="换一个别称"><ArrowCounterClockwise size={17}/>换一个</button>
    </div>
    <p className="ylm-reminder-usage">今天在养令待了 <strong>{formatDuration(todaySeconds)}</strong>，数据只存在本机。</p>
    <label className="ylm-reminder-row"><span>到点提醒我起身养生</span><input type="checkbox" className="ylm-reminder-switch" checked={reminder.enabled} onChange={e => onChange({ ...reminder, enabled: e.target.checked })} aria-label="开启养生提醒"/></label>
    <label className="ylm-reminder-row"><span>提醒间隔</span><select className="ylm-reminder-select" value={reminder.intervalMin} aria-label="提醒间隔" onChange={e => onChange({ ...reminder, intervalMin: Number(e.target.value) })}>{[15, 30, 45, 60, 90].map(min => <option key={min} value={min}>每 {min} 分钟</option>)}</select></label>
    <div className="ylm-reminder-sec">
      <p className="ylm-reminder-label">{native ? '安卓系统通知' : '浏览器通知'}</p>
      {permission === 'granted' ? <p className="ylm-reminder-ok">{native ? '已授权 · 提醒由手机系统安排' : '已授权 · 网页打开时可以提醒'}</p> : permission === 'unsupported' ? <p className="ylm-reminder-ok">当前环境暂不支持通知</p> : <button className="ylm-reminder-link" onClick={grant}>{permission === 'denied' ? '请到系统设置中开启通知权限' : '授权通知'}</button>}
    </div>
    {native && <button className="ylm-primary" onClick={async () => { try { notify(await testNativeNotification() ? '测试通知将在约 5 秒后出现在通知栏。' : '请先开启通知权限。') } catch { notify('测试通知发送失败，请检查系统通知设置。') } }}>发送一条测试通知</button>}
    <p className="ylm-source-note">{native ? '提醒保存在本机，退出页面后由安卓系统通知。省电模式可能延迟提醒；系统强行停止应用后，重新打开即可恢复。' : '网页提醒需要保持页面打开。安卓 App 可由手机系统在后台提醒。'}</p>
  </Sheet>
}

export default function MobileApp() {
  const initialRoute = parseMobileRoute(location.hash)
  const [tab, setTab] = useState(initialRoute.tab)
  const [mode, setMode] = useState(() => location.hash === '#motion' ? 'parent' : 'child')
  const [toast, setToast] = useState('')
  const [completed, setCompleted] = useState([])
  const [config, setConfig] = useState(() => loadConfig())
  const [adminOpen, setAdminOpen] = useState(initialRoute.admin)
  const [reminderOpen, setReminderOpen] = useState(false)
  const [reminder, setReminder] = useState(() => loadReminder())
  const [alias, setAlias] = useState(() => loadAlias() || saveAlias(generateAlias()))
  const [todaySeconds, setTodaySeconds] = useState(() => loadTodaySeconds())
  const scrollRef = useRef(null)
  const sessionStart = useRef(Date.now())
  useEffect(() => {
    // 使用时长：每 10s 结算一次已过时间，写入 localStorage（数据只存本机）
    const tick = () => {
      const now = Date.now()
      const elapsed = (now - sessionStart.current) / 1000
      if (elapsed >= 10) {
        addTodaySeconds(elapsed)
        sessionStart.current = now
        setTodaySeconds(loadTodaySeconds())
        maybeLocalNotify()
      }
    }
    const settle = () => {
      addTodaySeconds((Date.now() - sessionStart.current) / 1000)
      sessionStart.current = Date.now()
      setTodaySeconds(loadTodaySeconds())
    }
    const id = setInterval(tick, 10000)
    const hide = () => { if (document.visibilityState === 'hidden') settle() }
    window.addEventListener('pagehide', settle)
    document.addEventListener('visibilitychange', hide)
    return () => { clearInterval(id); window.removeEventListener('pagehide', settle); document.removeEventListener('visibilitychange', hide) }
  }, [alias])
  function maybeLocalNotify() {
    if (isAndroidApp()) return
    // 页面内保底提醒：开启且距上次提醒超过间隔时弹系统通知（页面需打开）
    const current = loadReminder()
    if (!current.enabled) return
    const last = Number(localStorage.getItem(LAST_NOTIFY_KEY) || 0)
    const now = Date.now()
    if (now - last < current.intervalMin * 60 * 1000) return
    const minutes = Math.floor(loadTodaySeconds() / 60) || 1
    const msg = pickTemplate(alias, minutes, 'nudge')
    localStorage.setItem(LAST_NOTIFY_KEY, String(now))
    showLocalNotification(msg.title, msg.body, { onClick: () => setTab('home') })
  }
  async function updateReminder(next) {
    try {
      if (isAndroidApp()) {
        const result = await syncNativeReminder(next, alias, { request: next.enabled })
        if (next.enabled && result !== 'granted') { setToast('请先在系统中允许养令发送通知。'); return }
      } else if (next.enabled && await ensureNotificationPermission() !== 'granted') { setToast('请先允许浏览器通知。'); return }
      setReminder(saveReminder(next))
    } catch { setToast('提醒设置暂未保存，请重试。') }
  }
  useEffect(() => {
    if (!isAndroidApp()) return
    syncNativeReminder(reminder, alias).catch(() => setToast('请检查养令的系统通知权限。'))
    const listener = listenForReminder(() => navigate('home'))
    return () => { listener.then(handle => handle.remove()).catch(() => {}) }
  }, [alias, reminder])
  function rollAlias() { setAlias(saveAlias(generateAlias(new Date(), Math.random))) }
  useEffect(() => {
    const listener = () => { const route = parseMobileRoute(location.hash); setTab(route.tab); setAdminOpen(route.admin) }
    window.addEventListener('hashchange', listener)
    return () => window.removeEventListener('hashchange', listener)
  }, [])
  useEffect(() => { scrollRef.current?.scrollTo(0,0) }, [tab])
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(''), 4500); return () => clearTimeout(id) }, [toast])
  function navigate(value) { setTab(value); history.pushState(null, '', '#' + value) }
  function complete(type) { setCompleted(items => items.includes(type) ? items : [...items, type]) }
  function updateConfig(next) {
    const value = next.dialect && Object.keys(next).length === 1 ? saveConfig({ ...config, dialect: next.dialect }) : saveConfig(next)
    setConfig(value); setAdminOpen(false); setToast('后台配置已保存并生效。')
  }
  return <div className="ylm-stage"><div className={`ylm-app ${mode === 'parent' ? 'parent-mode' : ''}`} data-testid="mobile-app">
    <div className="ylm-scroll" ref={scrollRef}>
      <header className="ylm-header"><button className="ylm-brand" aria-label="养令首页" onClick={() => navigate('home')}><img className="ylm-brand-logo" src={brandLogo} alt="养令"/><span className="ylm-brand-copy"><b>养令</b><small>YangLing</small></span></button><div className="ylm-header-tools"><div className="ylm-mode" aria-label="使用模式" role="group"><button aria-pressed={mode === 'child'} className={mode === 'child' ? 'active' : ''} onClick={() => setMode('child')}>儿女版</button><button aria-pressed={mode === 'parent'} className={mode === 'parent' ? 'active' : ''} onClick={() => setMode('parent')}>家长版</button></div><button className={`ylm-reminder-trigger ${reminder.enabled ? 'on' : ''}`} aria-label="养生提醒设置" aria-pressed={reminder.enabled} onClick={() => setReminderOpen(true)}><Bell size={19} weight={reminder.enabled ? 'fill' : 'regular'}/></button></div></header>
      {tab === 'home' && <Home onMove={() => navigate('motion')} notify={setToast} completed={completed} onComplete={complete} dialect={config.dialect}/>}
      {tab === 'knowledge' && <Knowledge notify={setToast} config={config} onOpenAdmin={updateConfig}/>}
      {tab === 'motion' && <Motion notify={setToast} onComplete={complete} courses={config.courses}/>}
    </div>
    <nav className="ylm-bottom-nav" aria-label="主导航">{[{ key:'home', label:'轻养生' }, { key:'knowledge', label:'问答知识库' }, { key:'motion', label:'动作识别' }].map(({key,label}) => <button key={key} aria-current={tab === key ? 'page' : undefined} className={tab === key ? 'active' : ''} onClick={() => navigate(key)}><span className={`ylm-nav-icon nav-${key} ${tab === 'motion' && key === 'home' ? 'leaf' : ''}`} aria-hidden="true"/><span>{label}</span></button>)}</nav>
    {toast && <div className="ylm-toast" role="status">{toast}</div>}
    {adminOpen && <AdminPanel config={config} onSave={updateConfig} onClose={() => { setAdminOpen(false); history.replaceState(null, '', '#home') }}/>}
    {reminderOpen && <ReminderSheet alias={alias} onRollAlias={rollAlias} todaySeconds={todaySeconds} reminder={reminder} onChange={updateReminder} notify={setToast} onClose={() => setReminderOpen(false)}/>}
  </div></div>
}
