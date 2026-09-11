import React, { useEffect, useRef, useState } from 'react'
import { Check, Database, FilmStrip, GearSix, Plus, Trash, X } from '@phosphor-icons/react'
import { DIALECTS, LLM_PRESETS, KNOWLEDGE_FORMATS, KNOWLEDGE_TEMPLATE, normalizeConfig, parseKnowledgeFile, validateVideoUrl } from './config.js'
import {fetchAdminConfig,publishConfig,uploadAudio,apiUrl} from './service.js'

export default function AdminPanel({ config, onSave, onClose }) {
  const [draft, setDraft] = useState(() => normalizeConfig(config))
  const [section, setSection] = useState('llm')
  const [error, setError] = useState('')
  const [knowledgeFormat, setKnowledgeFormat] = useState('json')
  const [importError, setImportError] = useState('')
  const [token,setToken]=useState(''),[authenticated,setAuthenticated]=useState(false),[busy,setBusy]=useState(false)
  const [research,setResearch]=useState(null)
  useEffect(()=>{fetch(apiUrl('/api/research')).then(r=>r.ok?r.json():null).then(r=>setResearch(r?.stats||null)).catch(()=>{})},[])
  const panel = useRef(null)
  const knowledgeFile = useRef(null)
  useEffect(() => {
    panel.current?.focus()
    const onKey = event => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function setLlm(key, nextValue) { setDraft(current => ({ ...current, llm: { ...current.llm, [key]: nextValue } })) }
  function applyLlmPreset(id) {
    const preset = LLM_PRESETS.find(item => item.id === id)
    if (!preset || id === 'custom') return
    setDraft(current => ({ ...current, llm: { ...current.llm, provider: preset.provider, baseUrl: preset.baseUrl, model: preset.model } }))
  }
  function setKnowledge(index, key, value) { setDraft(current => ({ ...current, knowledge: current.knowledge.map((item, i) => i === index ? { ...item, [key]: value } : item) })) }
  function downloadKnowledgeTemplate() {
    const blob = new Blob([KNOWLEDGE_TEMPLATE], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'yangling-knowledge-template.json'
    link.click()
    URL.revokeObjectURL(url)
  }
  function importKnowledge(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const imported = parseKnowledgeFile(String(reader.result || ''), knowledgeFormat)
        setDraft(current => ({ ...current, knowledge: imported }))
        setImportError(`已导入 ${imported.length} 条知识，保存后生效。`)
      } catch (e) {
        setImportError(e.message || '导入失败，请检查文件格式。')
      } finally { event.target.value = '' }
    }
    reader.readAsText(file)
  }
  function setCourse(index, key, value) { setDraft(current => ({ ...current, courses: current.courses.map((item, i) => i === index ? { ...item, [key]: value } : item) })) }
  async function login(){setBusy(true);setError('');try{setDraft(normalizeConfig(await fetchAdminConfig(token)));setAuthenticated(true)}catch{setError('管理凭证无效或服务暂未连接。')}finally{setBusy(false)}}
  function setAudio(index,key,value){setDraft(current=>({...current,audio:current.audio.map((item,i)=>i===index?{...item,[key]:value}:item)}))}
  async function upload(event,index){const input=event.target,file=input.files?.[0],id=draft.audio[index]?.id;if(!file||!id)return;setBusy(true);setError('');try{const item=await uploadAudio(file,token);setDraft(c=>({...c,audio:c.audio.map(a=>a.id===id?{...a,url:item.url,name:file.name.replace(/\.[^.]+$/,'')}:a)}))}catch(e){setError(e.message||'音频上传失败。')}finally{setBusy(false);input.value=''}}
  async function save() {
    if(draft.audio.some(item=>item.enabled&&(!item.name.trim()||!(/^(https:\/\/|\/api\/audio\/|audio\/)/.test(item.url))))){setError('启用的音频需要名称和 HTTPS 音频链接、静态音频路径，或先上传文件。');setSection('audio');return}
    const invalid = draft.courses.find(item => item.videoUrl && !validateVideoUrl(item.videoUrl))
    if (invalid) { setError(`“${invalid.moveName || invalid.name}”需要填写 http 或 https 视频链接。`); setSection('courses'); return }
    if (!draft.llm.provider.trim() || !draft.llm.model.trim()) { setError('LLM 服务商和模型名称需要填写。'); setSection('llm'); return }
    setBusy(true);setError('');try{const saved=await publishConfig(draft,token);setDraft(normalizeConfig(saved));onSave(saved)}catch(e){setError(e.message||'配置尚未发布，请重试。')}finally{setBusy(false)}
  }

  return <div className="ylm-admin-overlay" role="presentation">
    <section className="ylm-admin" role="dialog" aria-modal="true" aria-label="养令后台配置" tabIndex={-1} ref={panel}>
      <header className="ylm-admin-head"><div><span>养令管理台</span><small>发布后同步到网站与 App</small></div><button className="ylm-icon-btn" aria-label="关闭后台" onClick={onClose}><X size={24}/></button></header>
      {!authenticated?<form className="yl-admin-login" onSubmit={e=>{e.preventDefault();login()}}><h2>管理登录</h2><label>管理凭证<input type="password" value={token} onChange={e=>setToken(e.target.value)} autoComplete="off" required/></label><button className="ylm-primary" disabled={busy}>{busy?'正在连接…':'进入管理台'}</button><p>凭证仅在此次管理会话使用。</p>{error&&<p role="alert">{error}</p>}</form>:<>
      <nav className="ylm-admin-tabs" aria-label="后台配置分类">
        <button className={section === 'llm' ? 'active' : ''} onClick={() => setSection('llm')}><GearSix size={20}/>LLM</button>
        <button className={section === 'knowledge' ? 'active' : ''} onClick={() => setSection('knowledge')}><Database size={20}/>知识库</button>
        <button className={section === 'courses' ? 'active' : ''} onClick={() => setSection('courses')}><FilmStrip size={20}/>教学视频</button>
        <button className={section === 'audio' ? 'active' : ''} onClick={()=>setSection('audio')}>冥想音频</button>
        <button className={section === 'generation' ? 'active' : ''} onClick={()=>setSection('generation')}>动态卡片</button>
      </nav>
      <div className="ylm-admin-body">
        <details className="yl-migration"><summary>从旧版配置迁移</summary><p>仅在本机存在旧版配置时可读取，检查后点发布才会上传。</p><button onClick={()=>{try{const old=localStorage.getItem('yangling:pre-server-config');if(!old)throw new Error();setDraft(normalizeConfig(JSON.parse(old)));setError('旧版配置已载入草稿，请检查知识审核状态与教学链接后发布。')}catch{setError('此设备没有可迁移的旧版配置。')}}}>载入本机旧版草稿</button></details>
        {section === 'llm' && <div className="ylm-form-grid">
          <label className="wide">常用服务预设<select defaultValue="custom" onChange={e => applyLlmPreset(e.target.value)}>{LLM_PRESETS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <label>服务商<input value={draft.llm.provider} onChange={e => setLlm('provider', e.target.value)} placeholder="OpenAI Compatible"/></label>
          <label>模型名称<input value={draft.llm.model} onChange={e => setLlm('model', e.target.value)} placeholder="模型 ID"/></label>
          <label className="wide">API 地址<input value={draft.llm.baseUrl} onChange={e => setLlm('baseUrl', e.target.value)} placeholder="https://…/v1"/></label>
          <label className="wide">API Key<input type="password" value={draft.llm.apiKey||''} onChange={e => setLlm('apiKey', e.target.value)} placeholder={draft.llm.configured?'已配置，留空保留原密钥':'仅保存在服务器'} autoComplete="off"/></label>
          <label className="ylm-switch wide"><input type="checkbox" checked={draft.llm.clearApiKey===true} onChange={e=>setLlm('clearApiKey',e.target.checked)}/>清除已有密钥</label>
          <label className="wide">系统提示词<textarea value={draft.llm.systemPrompt} onChange={e => setLlm('systemPrompt', e.target.value)}/></label>
          <label>默认语音<select value={draft.dialect} onChange={e => setDraft(current => ({ ...current, dialect: e.target.value }))}>{DIALECTS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        </div>}
        {section === 'knowledge' && <div className="ylm-admin-list">
          {research&&<p className="yl-source-label">内置研究资料：{research.papers} 篇 / {research.chunks} 个切片。问答可检索原文；不自动标记为个体养生建议的审核依据。</p>}
          <div className="ylm-knowledge-import">
            <div><strong>知识库导入</strong><small>导入后统一转成标题、关键词、答案、来源、标签，RAG 只从这些条目取依据。</small></div>
            <label>格式<select value={knowledgeFormat} onChange={e => setKnowledgeFormat(e.target.value)}>{KNOWLEDGE_FORMATS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
            <div className="ylm-knowledge-actions"><button type="button" onClick={downloadKnowledgeTemplate}>下载 JSON 模板</button><button type="button" onClick={() => knowledgeFile.current?.click()}>导入文件</button><input ref={knowledgeFile} hidden type="file" accept={KNOWLEDGE_FORMATS.find(item => item.id === knowledgeFormat)?.accept} onChange={importKnowledge}/></div>
            {importError && <p role="status">{importError}</p>}
          </div>
          {draft.knowledge.map((item, index) => <article className="ylm-admin-card" key={item.id}>
            <div className="ylm-admin-card-title"><strong>知识条目 {index + 1}</strong><button aria-label={`删除知识条目 ${index + 1}`} onClick={() => setDraft(current => ({ ...current, knowledge: current.knowledge.filter((_, i) => i !== index) }))}><Trash size={19}/></button></div>
            <label>标题<input value={item.title} onChange={e => setKnowledge(index, 'title', e.target.value)}/></label>
            <label>关键词<input value={item.keywords} onChange={e => setKnowledge(index, 'keywords', e.target.value)} placeholder="用逗号分隔"/></label>
            <label>回答<textarea value={item.answer} onChange={e => setKnowledge(index, 'answer', e.target.value)}/></label>
            <label>来源<input value={item.source} onChange={e => setKnowledge(index, 'source', e.target.value)}/></label>
            <label>来源链接<input value={item.sourceUrl||''} onChange={e=>setKnowledge(index,'sourceUrl',e.target.value)} placeholder="可核对的原文链接"/></label>
            <label className="ylm-switch"><input type="checkbox" checked={item.reviewed===true} onChange={e=>setKnowledge(index,'reviewed',e.target.checked)}/>已核对内容，允许用于生成</label>
          </article>)}
          <button className="ylm-admin-add" onClick={() => setDraft(current => ({ ...current, knowledge: [...current.knowledge, { id: crypto.randomUUID(), title: '', keywords: '', answer: '', source: '', reviewed:false }] }))}><Plus size={20}/>新增知识条目</button>
        </div>}
        {section==='audio'&&<div className="ylm-admin-list"><p>上传 MP3、WAV、OGG 或 M4A，单段不超过 20 MB。用户随机播放，练习约三分钟。</p>{draft.audio.map((item,index)=><article className="ylm-admin-card" key={item.id}><div className="ylm-admin-card-title"><strong>音频 {index+1}</strong><button aria-label={`删除音频 ${index+1}`} onClick={()=>setDraft(c=>({...c,audio:c.audio.filter((_,i)=>i!==index)}))}><Trash size={19}/></button></div><label>名称<input value={item.name} onChange={e=>setAudio(index,'name',e.target.value)}/></label><label>音频链接<input value={item.url} onChange={e=>setAudio(index,'url',e.target.value)} placeholder="https://…"/></label><label>或上传文件<input type="file" accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,.mp3,.wav,.ogg,.m4a" disabled={busy} onChange={e=>upload(e,index)}/></label><label>时长（秒）<input type="number" min="1" max="3600" value={item.durationSeconds||180} onChange={e=>setAudio(index,'durationSeconds',Number(e.target.value))}/></label><label className="ylm-switch"><input type="checkbox" checked={item.enabled} onChange={e=>setAudio(index,'enabled',e.target.checked)}/>允许随机推荐</label>{item.url&&<audio controls preload="none" src={item.url}/>}</article>)}<button className="ylm-admin-add" onClick={()=>setDraft(c=>({...c,audio:[...c.audio,{id:crypto.randomUUID(),name:'',url:'',durationSeconds:180,enabled:true}]}))}><Plus size={20}/>添加音频</button></div>}
        {section==='generation'&&<div className="ylm-admin-list"><label className="ylm-switch"><input type="checkbox" checked={draft.generation.enabled} onChange={e=>setDraft(c=>({...c,generation:{...c.generation,enabled:e.target.checked}}))}/>根据知识库动态生成卡片</label><label>生成要求<textarea value={draft.generation.instructions} onChange={e=>setDraft(c=>({...c,generation:{...c.generation,instructions:e.target.value}}))} placeholder="简短、适合日常实践；有依据时结合中西医观点"/></label><label>内容长度上限<input type="number" min="100" max="1000" value={draft.generation.maxLength} onChange={e=>setDraft(c=>({...c,generation:{...c.generation,maxLength:Number(e.target.value)}}))}/></label><p>未配置模型、依据不足或生成失败时使用以下基础内容。</p>{[['cup','一杯'],['move','一动'],['breath','一息']].map(([key,title])=><label key={key}>{title}备用内容<textarea value={draft.generation.fallback[key]} onChange={e=>setDraft(c=>({...c,generation:{...c.generation,fallback:{...c.generation.fallback,[key]:e.target.value}}}))}/></label>)}</div>}
        {section === 'courses' && <div className="ylm-admin-list">
          {draft.courses.map((item, index) => <article className="ylm-admin-card" key={item.id}>
            <div className="ylm-admin-card-title"><strong>教学动作 {index + 1}</strong><button aria-label={`删除教学动作 ${index + 1}`} onClick={() => setDraft(current => ({ ...current, courses: current.courses.filter((_, i) => i !== index) }))}><Trash size={19}/></button></div>
            <div className="ylm-form-grid"><label>套式名称<input value={item.name} onChange={e => setCourse(index, 'name', e.target.value)} placeholder="八段锦"/></label><label>动作名称<input value={item.moveName} onChange={e => setCourse(index, 'moveName', e.target.value)} placeholder="双手托天"/></label></div>
            <label>教学视频链接<input value={item.videoUrl} onChange={e => setCourse(index, 'videoUrl', e.target.value)} placeholder="https://…"/></label>
            <label className="ylm-switch"><input type="checkbox" checked={item.enabled} onChange={e => setCourse(index, 'enabled', e.target.checked)}/>在 App 中启用</label>
          </article>)}
          <button className="ylm-admin-add" onClick={() => setDraft(current => ({ ...current, courses: [...current.courses, { id: crypto.randomUUID(), name: '', moveName: '', videoUrl: '', enabled: true }] }))}><Plus size={20}/>新增教学动作</button>
        </div>}
      </div>
      {error && <p className="ylm-admin-error" role="alert">{error}</p>}
      <footer className="ylm-admin-footer"><button onClick={onClose}>关闭</button><button className="save" disabled={busy} onClick={save}><Check size={20}/>{busy?'正在保存…':'发布配置'}</button></footer></>}
    </section>
  </div>
}
