import React, { useEffect, useRef, useState } from 'react'
import { Check, Database, FilmStrip, GearSix, Plus, Trash, X } from '@phosphor-icons/react'
import { DIALECTS, LLM_PRESETS, KNOWLEDGE_FORMATS, KNOWLEDGE_TEMPLATE, normalizeConfig, parseKnowledgeFile, validateVideoUrl } from './config.js'

export default function AdminPanel({ config, onSave, onClose }) {
  const [draft, setDraft] = useState(() => normalizeConfig(config))
  const [section, setSection] = useState('llm')
  const [error, setError] = useState('')
  const [knowledgeFormat, setKnowledgeFormat] = useState('json')
  const [importError, setImportError] = useState('')
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
  function save() {
    const invalid = draft.courses.find(item => item.enabled && !validateVideoUrl(item.videoUrl))
    if (invalid) { setError(`“${invalid.moveName || invalid.name}”需要填写 http 或 https 视频链接。`); setSection('courses'); return }
    if (!draft.llm.provider.trim() || !draft.llm.model.trim()) { setError('LLM 服务商和模型名称需要填写。'); setSection('llm'); return }
    onSave(draft)
  }

  return <div className="ylm-admin-overlay" role="presentation">
    <section className="ylm-admin" role="dialog" aria-modal="true" aria-label="养令后台配置" tabIndex={-1} ref={panel}>
      <header className="ylm-admin-head"><div><span>养令管理台</span><small>配置修改后立即作用于当前 Demo</small></div><button className="ylm-icon-btn" aria-label="关闭后台" onClick={onClose}><X size={24}/></button></header>
      <nav className="ylm-admin-tabs" aria-label="后台配置分类">
        <button className={section === 'llm' ? 'active' : ''} onClick={() => setSection('llm')}><GearSix size={20}/>LLM</button>
        <button className={section === 'knowledge' ? 'active' : ''} onClick={() => setSection('knowledge')}><Database size={20}/>知识库</button>
        <button className={section === 'courses' ? 'active' : ''} onClick={() => setSection('courses')}><FilmStrip size={20}/>教学视频</button>
      </nav>
      <div className="ylm-admin-body">
        {section === 'llm' && <div className="ylm-form-grid">
          <label className="wide">常用服务预设<select defaultValue="custom" onChange={e => applyLlmPreset(e.target.value)}>{LLM_PRESETS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <label>服务商<input value={draft.llm.provider} onChange={e => setLlm('provider', e.target.value)} placeholder="OpenAI Compatible"/></label>
          <label>模型名称<input value={draft.llm.model} onChange={e => setLlm('model', e.target.value)} placeholder="模型 ID"/></label>
          <label className="wide">API 地址<input value={draft.llm.baseUrl} onChange={e => setLlm('baseUrl', e.target.value)} placeholder="https://…/v1"/></label>
          <label className="wide">API Key<input type="password" value={draft.llm.apiKey} onChange={e => setLlm('apiKey', e.target.value)} placeholder="仅保存在当前浏览器" autoComplete="off"/></label>
          <label className="wide">系统提示词<textarea value={draft.llm.systemPrompt} onChange={e => setLlm('systemPrompt', e.target.value)}/></label>
          <label>默认语音<select value={draft.dialect} onChange={e => setDraft(current => ({ ...current, dialect: e.target.value }))}>{DIALECTS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        </div>}
        {section === 'knowledge' && <div className="ylm-admin-list">
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
          </article>)}
          <button className="ylm-admin-add" onClick={() => setDraft(current => ({ ...current, knowledge: [...current.knowledge, { id: crypto.randomUUID(), title: '', keywords: '', answer: '', source: '' }] }))}><Plus size={20}/>新增知识条目</button>
        </div>}
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
      <footer className="ylm-admin-footer"><button onClick={onClose}>取消</button><button className="save" onClick={save}><Check size={20}/>保存配置</button></footer>
    </section>
  </div>
}
