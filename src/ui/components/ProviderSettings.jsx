import { useState } from 'react'
import { configureProvider, clearProvider, getProvider } from '../../core/agent/provider.js'
import './ProviderSettings.css'

/** 主流 OpenAI 兼容服务预设(均可改) */
const PRESETS = {
  deepseek: { name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  minimax: { name: 'MiniMax', baseUrl: 'https://api.minimax.chat/v1', model: 'abab6.5s-chat' },
  stepfun: { name: '阶跃星辰', baseUrl: 'https://api.stepfun.com/v1', model: 'step-1-8k' },
  custom: { name: '自定义', baseUrl: '', model: '' },
}

export default function ProviderSettings({ onClose, onChanged }) {
  const existing = getProvider()
  const [vendor, setVendor] = useState(() => {
    if (!existing) return 'deepseek'
    const hit = Object.entries(PRESETS).find(([, p]) => p.baseUrl === existing.baseUrl)
    return hit ? hit[0] : 'custom'
  })
  const [apiKey, setApiKey] = useState(existing?.apiKey || '')
  const [baseUrl, setBaseUrl] = useState(existing?.baseUrl || PRESETS.deepseek.baseUrl)
  const [model, setModel] = useState(existing?.model || PRESETS.deepseek.model)
  const [toast, setToast] = useState('')

  function applyPreset(key) {
    setVendor(key)
    if (key === 'custom') return
    setBaseUrl(PRESETS[key].baseUrl)
    setModel(PRESETS[key].model)
  }

  function handleSave() {
    if (!apiKey.trim()) {
      setToast('请填写 API Key(本地保存,不会上传)')
      return
    }
    const name = vendor === 'custom' ? (baseUrl ? '自定义' : '') : PRESETS[vendor].name
    configureProvider({ name, apiKey: apiKey.trim(), baseUrl: baseUrl.trim(), model: model.trim() })
    setToast('✓ 已保存,当前为在线模式(LLM 润色)')
    onChanged?.()
    setTimeout(() => onClose?.(), 1200)
  }

  function handleClear() {
    clearProvider()
    setApiKey('')
    setToast('✓ 已清除,回到演示模式(规则检索)')
    onChanged?.()
    setTimeout(() => onClose?.(), 1200)
  }

  return (
    <div className="provider-mask" role="dialog" aria-modal="true" aria-label="接入 LLM 设置" onClick={onClose}>
      <div className="provider-dialog yl-card" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-serif">接入 LLM(可选增强)</h3>
        <p className="provider-tip">
          配置后仅对文案做润色,不改变卡片与医学事实;不填 key 也能完整演示(纯规则 + RAG 引用)。
        </p>

        <label className="provider-field">
          <span>服务商</span>
          <select value={vendor} onChange={(e) => applyPreset(e.target.value)}>
            <option value="deepseek">DeepSeek</option>
            <option value="minimax">MiniMax</option>
            <option value="stepfun">阶跃星辰</option>
            <option value="custom">自定义(OpenAI 兼容)</option>
          </select>
        </label>

        <label className="provider-field">
          <span>Base URL</span>
          <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.deepseek.com/v1" />
        </label>

        <label className="provider-field">
          <span>模型</span>
          <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="deepseek-chat" />
        </label>

        <label className="provider-field">
          <span>API Key</span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            autoComplete="off"
          />
        </label>

        {toast && <p className="provider-toast">{toast}</p>}

        <div className="provider-actions">
          <button className="yl-btn yl-btn--season" onClick={handleSave}>保存</button>
          <button className="yl-btn yl-btn--ghost" onClick={handleClear}>清除</button>
          <button className="yl-btn yl-btn--ghost" onClick={onClose}>取消</button>
        </div>
      </div>
    </div>
  )
}
