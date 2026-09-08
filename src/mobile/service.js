const PRODUCTION_API = 'https://yangling.entermodetwo.com'

function baseUrl() {
  const configured = import.meta.env?.VITE_API_BASE
  if (configured) return configured.replace(/\/$/, '')
  if (typeof location === 'undefined') return PRODUCTION_API
  const native = location.protocol === 'capacitor:' || location.protocol === 'file:'
  const pages = location.hostname.endsWith('.github.io')
  return native || pages ? PRODUCTION_API : ''
}

export function apiUrl(path = '') {
  const value = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl()}${value}`
}

async function request(path, options = {}) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 12000)
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
  return request('/api/admin/audio', { method: 'POST', headers: { ...tokenHeaders(token), 'Content-Type': file.type, 'X-Filename': file.name }, body: file })
}
export async function generateKnowledge(kind, question) {
  return request('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, question }) })
}
