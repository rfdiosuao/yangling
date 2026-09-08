import { Capacitor } from '@capacitor/core'

const PRODUCTION_API = 'https://yangling.entermodetwo.com'

function baseUrl() {
  const configured = import.meta.env?.VITE_API_BASE
  if (configured) return configured.replace(/\/$/, '')
  if (typeof location === 'undefined') return PRODUCTION_API
  const native = Capacitor.isNativePlatform()
  const pages = location.hostname.endsWith('.github.io')
  return native || pages ? PRODUCTION_API : ''
}

export function apiUrl(path = '') {
  const value = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl()}${value}`
}

async function request(path, options = {}, timeoutMs = 12000) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(apiUrl(path), { ...options, signal: options.signal || controller.signal })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`)
    return payload
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('请求超时，请稍后重试')
    throw error
  } finally { clearTimeout(timer) }
}

function tokenHeaders(token, json = false) {
  return { Authorization: `Bearer ${token}`, ...(json ? { 'Content-Type': 'application/json' } : {}) }
}
function absoluteMedia(config) {
  return { ...config, audio: (config.audio || []).map(item => ({ ...item, url: item.url?.startsWith('/api/audio/') ? apiUrl(item.url) : item.url })) }
}

export async function fetchPublicConfig() { return absoluteMedia(await request('/api/config')) }
export async function fetchAdminConfig(token) { return absoluteMedia(await request('/api/admin/config', { headers: tokenHeaders(token) })) }
export async function publishConfig(config, token) { return absoluteMedia(await request('/api/admin/config', { method: 'PUT', headers: tokenHeaders(token, true), body: JSON.stringify(config) })) }
export async function uploadAudio(file, token) {
  const extension = file.name?.split('.').pop()?.toLowerCase()
  const aliases = { wav: 'audio/wav', wave: 'audio/wav', mp3: 'audio/mpeg', m4a: 'audio/mp4', mp4: 'audio/mp4', ogg: 'audio/ogg', oga: 'audio/ogg' }
  const type = aliases[extension] || ({ 'audio/x-wav': 'audio/wav', 'audio/wave': 'audio/wav', 'audio/x-m4a': 'audio/mp4' }[file.type] || file.type || 'application/octet-stream')
  const result = await request('/api/admin/audio', { method: 'POST', headers: { ...tokenHeaders(token), 'Content-Type': type, 'X-Filename': encodeURIComponent(file.name || 'audio') }, body: file }, 120000)
  return { ...result, url: result.url?.startsWith('/api/audio/') ? apiUrl(result.url) : result.url }
}
export async function generateKnowledge(kind, question) {
  return request('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, question }) })
}
