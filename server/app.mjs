import http from 'node:http'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { mkdir, open, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { extname, join, resolve, sep } from 'node:path'
import { lookup } from 'node:dns/promises'
import { normalizeConfig, DEFAULT_CONFIG, findKnowledgeMatches } from '../src/mobile/config.js'
import { buildLlmRequest } from '../src/mobile/llm.js'
import { makeAnswer, makePlan } from '../src/mobile/model.js'

const MAX_JSON = 256 * 1024
const MAX_AUDIO = 20 * 1024 * 1024
const AUDIO_TYPES = { 'audio/mpeg': '.mp3', 'audio/wav': '.wav', 'audio/ogg': '.ogg', 'audio/mp4': '.m4a' }
const FALLBACK_REASON = { disabled: '生成功能未启用', unconfigured: '生成服务未配置', no_sources: '没有匹配的已审核知识', upstream: '生成服务暂不可用', invalid: '生成结果未通过依据校验' }

function safeConfig(config) {
  const normalized = normalizeConfig(config)
  const { apiKey, clearApiKey, ...llm } = normalized.llm
  return { ...normalized, llm: { ...llm, configured: Boolean(apiKey || normalized.llm.configured) } }
}
function equalToken(actual, expected) {
  if (!actual || !expected) return false
  const a = createHash('sha256').update(actual).digest(), b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}
function json(res, status, body) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)) }
async function body(req, max) {
  const parts = []; let size = 0
  for await (const chunk of req) { size += chunk.length; if (size > max) throw Object.assign(new Error('body too large'), { status: 413 }); parts.push(chunk) }
  return Buffer.concat(parts)
}
function audioSignature(type, data) {
  if (type === 'audio/mpeg') return data.subarray(0, 3).toString() === 'ID3' || (data[0] === 0xff && (data[1] & 0xe0) === 0xe0)
  if (type === 'audio/wav') return data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WAVE'
  if (type === 'audio/ogg') return data.subarray(0, 4).toString() === 'OggS'
  if (type === 'audio/mp4') return data.subarray(4, 8).toString() === 'ftyp'
  return false
}
function isPrivate(ip) {
  const value = ip.replace(/^::ffff:/, '')
  if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.)/.test(value)) return true
  const m = value.match(/^172\.(\d+)\./); if (m && +m[1] >= 16 && +m[1] <= 31) return true
  return value === '::1' || value === '::' || /^f[cd]/i.test(value) || /^fe[89ab]/i.test(value)
}
async function assertSafeEndpoint(baseUrl, resolveHost) {
  const url = new URL(baseUrl)
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('unsafe endpoint')
  const addresses = await resolveHost(url.hostname)
  if (!addresses.length || addresses.some(isPrivate)) throw new Error('unsafe endpoint')
}
function validateLines(lines, count) {
  return lines.length > 0 && lines.every(line => { const cites = [...line.matchAll(/\[(\d+)]/g)].map(m => +m[1]); return cites.length && cites.every(n => n >= 1 && n <= count) })
}
function fallback(config, kind, reason, extra = {}) {
  return { lines: [String(config.generation.fallback[kind] || config.generation.fallback.question).slice(0, config.generation.maxLength)], sources: [], generated: false, reason: FALLBACK_REASON[reason], ...extra }
}

export function createYanglingServer({ dataDir = process.env.YANGLING_DATA_DIR || join(process.cwd(), 'data'), adminToken = process.env.YANGLING_ADMIN_TOKEN || '', fetcher = fetch, resolveHost = async host => (await lookup(host, { all: true })).map(x => x.address) } = {}) {
  const configPath = join(dataDir, 'config.json'), audioDir = join(dataDir, 'audio')
  let upstreamActive = 0, nextUpstreamAt = 0
  async function load() { try { return normalizeConfig(JSON.parse(await readFile(configPath, 'utf8'))) } catch (error) { if (error.code === 'ENOENT') return normalizeConfig(DEFAULT_CONFIG); throw error } }
  async function save(input) {
    const old = await load(), submitted = input?.llm || {}, next = normalizeConfig(input)
    next.llm.apiKey = submitted.clearApiKey ? '' : submitted.apiKey ? String(submitted.apiKey) : old.llm.apiKey || ''
    next.llm.configured = Boolean(next.llm.apiKey)
    await mkdir(dataDir, { recursive: true }); const temp = `${configPath}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`
    await writeFile(temp, JSON.stringify(next, null, 2), { mode: 0o600 }); await rename(temp, configPath); return next
  }
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost'); const origin = req.headers.origin
      if (origin && (/^https?:\/\/localhost(?::\d+)?$/.test(origin) || origin === 'https://yangling.entermodetwo.com' || /^https?:\/\/127\.0\.0\.1(?::5173)?$/.test(origin))) {
        res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Filename'); res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS')
      }
      if (req.method === 'OPTIONS') return res.writeHead(origin && res.getHeader('Access-Control-Allow-Origin') ? 204 : 403).end()
      if (!url.pathname.startsWith('/api/')) return json(res, 404, { error: 'not found' })
      if (req.method === 'GET' && url.pathname === '/api/health') return json(res, 200, { ok: true })
      if (req.method === 'GET' && url.pathname === '/api/config') return json(res, 200, safeConfig(await load()))
      const admin = url.pathname.startsWith('/api/admin/')
      if (admin && !equalToken((req.headers.authorization || '').replace(/^Bearer\s+/i, ''), adminToken)) return json(res, 401, { error: 'unauthorized' })
      if (req.method === 'GET' && url.pathname === '/api/admin/config') return json(res, 200, safeConfig(await load()))
      if (req.method === 'PUT' && url.pathname === '/api/admin/config') return json(res, 200, safeConfig(await save(JSON.parse((await body(req, MAX_JSON)).toString('utf8')))))
      if (req.method === 'POST' && url.pathname === '/api/admin/audio') {
        const type = String(req.headers['content-type'] || '').split(';')[0], ext = AUDIO_TYPES[type]
        if (!String(req.headers['x-filename'] || '').trim()) return json(res, 400, { error: 'filename required' })
        if (!ext) return json(res, 415, { error: 'unsupported audio type' })
        const data = await body(req, MAX_AUDIO); if (!audioSignature(type, data)) return json(res, 415, { error: 'invalid audio file' })
        await mkdir(audioDir, { recursive: true }); const name = `${Date.now()}-${randomBytes(8).toString('hex')}${ext}`; await writeFile(join(audioDir, name), data, { flag: 'wx' })
        return json(res, 201, { url: `/api/audio/${name}`, name })
      }
      if (req.method === 'GET' && url.pathname.startsWith('/api/audio/')) {
        const name = decodeURIComponent(url.pathname.slice('/api/audio/'.length)); const path = resolve(audioDir, name)
        if (!name || name.includes('/') || name.includes('\\') || !path.startsWith(resolve(audioDir) + sep)) return json(res, 404, { error: 'not found' })
        const info = await stat(path); let start = 0, end = info.size - 1, status = 200
        if (req.headers.range) { const match = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range); if (!match) return res.writeHead(416, { 'Content-Range': `bytes */${info.size}` }).end(); start = +match[1]; end = match[2] ? Math.min(+match[2], end) : end; if (start > end) return res.writeHead(416, { 'Content-Range': `bytes */${info.size}` }).end(); status = 206 }
        const file = await open(path, 'r'); const output = Buffer.alloc(end - start + 1); await file.read(output, 0, output.length, start); await file.close()
        res.writeHead(status, { 'Content-Type': Object.entries(AUDIO_TYPES).find(([, e]) => e === extname(name))?.[0] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Content-Length': output.length, ...(status === 206 ? { 'Content-Range': `bytes ${start}-${end}/${info.size}` } : {}) }); return res.end(output)
      }
      if (req.method === 'POST' && url.pathname === '/api/generate') {
        const input = JSON.parse((await body(req, 16 * 1024)).toString('utf8')), kind = input.kind, question = String(input.question || '').slice(0, 1000)
        if (!['cup', 'move', 'breath', 'question'].includes(kind)) return json(res, 400, { error: 'invalid kind' })
        const plan = makePlan(question), answer = makeAnswer(question)
        if (plan.urgent || answer.urgent) return json(res, 200, { lines: [plan.message || answer.lines[0]], sources: [], generated: false, reason: '安全提示优先' })
        const config = await load(); if (!config.generation.enabled) return json(res, 200, fallback(config, kind, 'disabled'))
        if (!config.llm.apiKey || !config.llm.baseUrl || !config.llm.model) return json(res, 200, fallback(config, kind, 'unconfigured'))
        const keywords = { cup: '饮水 茶 饮品', move: '运动 舒展 肩颈 八段锦', breath: '呼吸 放松 压力', question: '' }[kind]
        const matches = findKnowledgeMatches(`${question} ${keywords}`, config.knowledge.filter(x => x.reviewed && x.answer && x.enabled !== false), 3)
        if (!matches.length) return json(res, 200, fallback(config, kind, 'no_sources'))
        if (upstreamActive >= 2 || Date.now() < nextUpstreamAt) return json(res, 200, fallback(config, kind, 'upstream'))
        try {
          upstreamActive++; nextUpstreamAt = Date.now() + 250; await assertSafeEndpoint(config.llm.baseUrl, resolveHost)
          const context = matches.map((x, i) => `[${i + 1}] ${x.title}\n${x.answer}\n来源：${x.source}`).join('\n\n')
          const request = buildLlmRequest({ ...config.llm, systemPrompt: `${config.llm.systemPrompt}\n${config.generation.instructions}` }, question, context)
          const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 10000)
          let response
          try { response = await fetcher(request.url, { ...request.options, redirect: 'error', signal: controller.signal }) } finally { clearTimeout(timer) }
          if (!response.ok) throw new Error('upstream failure')
          const payload = await response.json(), text = String(payload?.choices?.[0]?.message?.content || '').slice(0, config.generation.maxLength)
          const lines = text.split(/\n+/).map(x => x.replace(/^\s*(?:[-•]|\d+[.、])\s*/, '').trim()).filter(Boolean).slice(0, 5)
          if (!validateLines(lines, matches.length)) return json(res, 200, fallback(config, kind, 'invalid'))
          return json(res, 200, { lines, sources: matches.map(x => ({ title: x.source || x.title, body: x.answer, reviewed: true, ...(x.sourceUrl ? { sourceUrl: x.sourceUrl } : {}) })), generated: true, reason: '已使用审核知识生成' })
        } catch { return json(res, 200, fallback(config, kind, 'upstream')) } finally { upstreamActive-- }
      }
      json(res, 404, { error: 'not found' })
    } catch (error) { json(res, error.status || (error instanceof SyntaxError ? 400 : 500), { error: error.status === 413 ? 'request too large' : error instanceof SyntaxError ? 'invalid json' : 'request failed' }) }
  })
}

export function startServer(options = {}) {
  const server = createYanglingServer(options), port = Number(process.env.PORT || 8789)
  server.listen(port, '127.0.0.1', () => console.log(`YangLing API listening on 127.0.0.1:${port}`))
  return server
}
