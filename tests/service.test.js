import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createYanglingServer } from '../server/app.mjs'
import { Capacitor } from '@capacitor/core'
import { apiUrl, uploadAudio } from '../src/mobile/service.js'

const running = []
async function start(options = {}) {
  const dataDir = options.dataDir || await mkdtemp(join(tmpdir(), 'yangling-'))
  const server = createYanglingServer({ dataDir, adminToken: 'test-token', ...options })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}/api`
  running.push({ server, dataDir })
  return { base, dataDir }
}
const auth = { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' }

afterEach(async () => {
  await Promise.all(running.splice(0).map(({ server, dataDir }) => new Promise(resolve => server.close(async () => { await rm(dataDir, { recursive: true, force: true }); resolve() }))))
})

describe('YangLing service', () => {
  it('answers without matching knowledge as explicitly uncited general advice', async () => {
    const {base}=await start({resolveHost:async()=>['93.184.216.34'],fetcher:async()=>new Response(JSON.stringify({choices:[{message:{content:'先放松肩膀，在舒适范围内慢慢活动。'}}]}))})
    await fetch(`${base}/admin/config`,{method:'PUT',headers:auth,body:JSON.stringify({llm:{apiKey:'key',baseUrl:'https://example.org/v1',model:'m'},generation:{enabled:true},knowledge:[]})})
    const answer=await(await fetch(`${base}/generate`,{method:'POST',headers:auth,body:JSON.stringify({kind:'move',question:'想活动一下'})})).json()
    expect(answer).toMatchObject({generated:true,basis:'general',sources:[],reason:'AI 通用建议'})
    expect(answer.lines[0]).toContain('肩膀')
  })
  it('serves health and sanitized public config while protecting admin mutations', async () => {
    const { base } = await start()
    expect((await fetch(`${base}/health`)).status).toBe(200)
    expect((await fetch(`${base}/admin/config`)).status).toBe(401)
    const publicResponse = await fetch(`${base}/config`, { headers: { Origin: 'https://rfdiosuao.github.io' } })
    expect(publicResponse.headers.get('cache-control')).toBe('no-store')
    expect(publicResponse.headers.get('access-control-allow-origin')).toBe('https://rfdiosuao.github.io')
    const publicConfig = await publicResponse.json()
    expect(publicConfig.llm.apiKey).toBeUndefined()
    expect(publicConfig.llm.configured).toBe(false)
    expect(publicConfig.knowledge.every(item => item.reviewed === false)).toBe(true)
  })

  it('allows only the documented local development CORS origins', async () => {
    const { base } = await start()
    for (const origin of ['http://localhost', 'https://localhost', 'http://localhost:5173', 'https://localhost:5173', 'http://127.0.0.1:5173', 'https://127.0.0.1:5173']) {
      const response = await fetch(`${base}/config`, { headers: { Origin: origin } })
      expect(response.headers.get('access-control-allow-origin')).toBe(origin)
    }
    for (const origin of ['http://localhost:3000', 'https://127.0.0.1', 'https://127.0.0.1:8789']) {
      const response = await fetch(`${base}/config`, { headers: { Origin: origin } })
      expect(response.headers.get('access-control-allow-origin')).toBeNull()
    }
  })

  it('persists config atomically and preserves or explicitly clears the secret', async () => {
    const { base, dataDir } = await start()
    const put = body => fetch(`${base}/admin/config`, { method: 'PUT', headers: auth, body: JSON.stringify(body) })
    let response = await put({ llm: { apiKey: 'top-secret', baseUrl: 'https://api.openai.com/v1', model: 'x' }, knowledge: [], courses: [] })
    expect(response.status).toBe(200)
    expect(JSON.stringify(await response.json())).not.toContain('top-secret')
    await put({ llm: { apiKey: '', model: 'y' }, knowledge: [], courses: [] })
    expect((await (await fetch(`${base}/admin/config`, { headers: { Authorization: 'Bearer test-token' } })).json()).llm.configured).toBe(true)
    await put({ llm: { clearApiKey: true }, knowledge: [], courses: [] })
    expect((await (await fetch(`${base}/admin/config`, { headers: { Authorization: 'Bearer test-token' } })).json()).llm.configured).toBe(false)
    expect((await readFile(join(dataDir, 'config.json'), 'utf8')).includes('top-secret')).toBe(false)
  })

  it('drops unknown credential-like config fields from public and persisted schemas', async () => {
    const { base, dataDir } = await start()
    const response = await fetch(`${base}/admin/config`, { method: 'PUT', headers: auth, body: JSON.stringify({
      llm: { apiKey: 'real-key', baseUrl: 'https://api.openai.com/v1', model: 'm', token: 'leak-token', password: 'leak-password', authorization: 'leak-auth' },
      generation: { enabled: true, instructions: 'brief', maxLength: 200, token: 'generation-token', authorization: 'generation-auth', fallback: { question: 'safe', password: 'nested-password' } },
      knowledge: [], courses: [],
    }) })
    const adminConfig = await response.json()
    const publicConfig = await (await fetch(`${base}/config`)).json()
    const persisted = await readFile(join(dataDir, 'config.json'), 'utf8')
    for (const value of ['leak-token', 'leak-password', 'leak-auth', 'generation-token', 'generation-auth', 'nested-password']) {
      expect(JSON.stringify(adminConfig)).not.toContain(value)
      expect(JSON.stringify(publicConfig)).not.toContain(value)
      expect(persisted).not.toContain(value)
    }
    expect(adminConfig).toMatchObject({ llm: { baseUrl: 'https://api.openai.com/v1', model: 'm', configured: true }, generation: { enabled: true, instructions: 'brief', maxLength: 200, fallback: { question: 'safe' } } })
  })

  it('loads persisted configuration after a server restart', async () => {
    const { base, dataDir } = await start()
    await fetch(`${base}/admin/config`, { method: 'PUT', headers: auth, body: JSON.stringify({ dialect: 'cantonese', llm: { apiKey: 'restart-secret' }, knowledge: [], courses: [] }) })
    const first = running.shift(); await new Promise(resolve => first.server.close(resolve))
    const restarted = await start({ dataDir })
    const config = await (await fetch(`${restarted.base}/admin/config`, { headers: { Authorization: 'Bearer test-token' } })).json()
    expect(config).toMatchObject({ dialect: 'cantonese', llm: { configured: true } })
    expect(JSON.stringify(config)).not.toContain('restart-secret')
  })

  it('uploads signed audio and serves byte ranges', async () => {
    const { base } = await start()
    const bytes = new Uint8Array([0x49, 0x44, 0x33, 4, 0, 0, 0, 0])
    const uploaded = await fetch(`${base}/admin/audio`, { method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'audio/mpeg', 'X-Filename': '../voice.mp3' }, body: bytes })
    expect(uploaded.status).toBe(201)
    const result = await uploaded.json()
    expect(result.name).not.toContain('..')
    const ranged = await fetch(`http://127.0.0.1:${new URL(base).port}${result.url}`, { headers: { Range: 'bytes=0-2' } })
    expect(ranged.status).toBe(206)
    expect(ranged.headers.get('content-range')).toBe('bytes 0-2/8')
    expect([...new Uint8Array(await ranged.arrayBuffer())]).toEqual([0x49, 0x44, 0x33])
    const suffix = await fetch(`http://127.0.0.1:${new URL(base).port}${result.url}`, { headers: { Range: 'bytes=-3' } })
    expect(suffix.status).toBe(206)
    expect(suffix.headers.get('content-range')).toBe('bytes 5-7/8')
    expect([...new Uint8Array(await suffix.arrayBuffer())]).toEqual([0, 0, 0])
    const invalid = await fetch(`http://127.0.0.1:${new URL(base).port}${result.url}`, { headers: { Range: 'bytes=8-9' } })
    expect(invalid.status).toBe(416)
    expect(invalid.headers.get('content-range')).toBe('bytes */8')
    expect((await fetch(`http://127.0.0.1:${new URL(base).port}/api/audio/missing.mp3`)).status).toBe(404)
  })

  it('rejects invalid audio signatures and unreviewed sources', async () => {
    const { base } = await start()
    expect((await fetch(`${base}/admin/audio`, { method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'audio/mpeg' }, body: 'x' })).status).toBe(400)
    expect((await fetch(`${base}/admin/audio`, { method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'audio/mpeg', 'X-Filename': 'bad.mp3' }, body: 'not mp3' })).status).toBe(415)
    const generated = await (await fetch(`${base}/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'question', question: '白露嗓子干' }) })).json()
    expect(generated.generated).toBe(false)
    expect(generated.sources).toEqual([])
  })

  it('exposes unreviewed research separately and uses it only for question discovery', async () => {
    const { base } = await start()
    const empty = await (await fetch(`${base}/research`)).json()
    expect(empty.stats.papers).toBeGreaterThan(0)
    expect(empty.sources).toEqual([])
    const research = await (await fetch(`${base}/research?q=${encodeURIComponent('睡眠不好')}`)).json()
    expect(research.sources[0]).toMatchObject({ reviewed: false, kind: 'research' })
    const question = await (await fetch(`${base}/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'question', question: '睡眠不好' }) })).json()
    expect(question).toMatchObject({ lines: ['找到相关研究资料，可展开知识依据查看原文。'], generated: false, reason: '研究资料原文，未作个体建议' })
    expect(question.sources[0]).toMatchObject({ reviewed: false, kind: 'research' })
    const card = await (await fetch(`${base}/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'breath', question: '睡眠不好' }) })).json()
    expect(card.sources).toEqual([])
  })

  it('uses only reviewed matches and validates citations from injected upstream fetcher', async () => {
    const upstream = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: '每小时起身活动。[1]' } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    const { base } = await start({ fetcher: upstream, resolveHost: async () => ['93.184.216.34'] })
    await fetch(`${base}/admin/config`, { method: 'PUT', headers: auth, body: JSON.stringify({ llm: { apiKey: 'k', baseUrl: 'https://llm.example.net/v1', model: 'm' }, generation: { enabled: true }, knowledge: [{ title: '久坐肩颈', keywords: '久坐,肩颈', answer: '每小时起身活动。', source: '办公建议', reviewed: true }], courses: [] }) })
    const response = await fetch(`${base}/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'question', question: '久坐肩颈紧' }) })
    const result = await response.json()
    expect(result).toMatchObject({ generated: true, lines: ['每小时起身活动。[1]'] })
    expect(result.sources[0]).toMatchObject({ title: '办公建议', reviewed: true })
    expect(upstream).toHaveBeenCalledOnce()
  })

  it('returns reviewed original knowledge for questions without card generation', async () => {
    const { base } = await start()
    await fetch(`${base}/admin/config`, { method: 'PUT', headers: auth, body: JSON.stringify({ generation: { enabled: false }, knowledge: [{ title: '久坐', keywords: '久坐', answer: '每小时起身一次。', source: '已审核指南', reviewed: true }], courses: [] }) })
    const result = await (await fetch(`${base}/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'question', question: '久坐怎么办' }) })).json()
    expect(result).toMatchObject({ lines: ['每小时起身一次。'], generated: false, sources: [{ title: '已审核指南', reviewed: true }] })
  })

  it('allows the three home cards concurrently and includes distinct kind intent', async () => {
    const prompts = []
    const upstream = vi.fn(async (_url, options) => {
      prompts.push(JSON.parse(options.body).messages.at(-1).content)
      return new Response(JSON.stringify({ choices: [{ message: { content: '请参考建议。[1]' } }] }), { status: 200 })
    })
    const { base } = await start({ fetcher: upstream, resolveHost: async () => ['93.184.216.34'] })
    await fetch(`${base}/admin/config`, { method: 'PUT', headers: auth, body: JSON.stringify({ llm: { apiKey: 'k', baseUrl: 'https://llm.example.net/v1', model: 'm' }, generation: { enabled: true }, knowledge: [{ title: '日常', keywords: '饮水,舒展,呼吸', answer: '请参考建议。', source: '指南', reviewed: true }], courses: [] }) })
    const kinds = ['cup', 'move', 'breath']
    const results = await Promise.all(kinds.map(kind => fetch(`${base}/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, question: '今天很累' }) }).then(r => r.json())))
    expect(results.every(x => x.generated)).toBe(true)
    expect(prompts.sort()).toEqual(expect.arrayContaining(kinds.map(kind => expect.stringContaining(kind))))
  })

  it('rate limits distinct proxy clients independently when nginx connects over loopback', async () => {
    const upstream = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: '请参考建议。[1]' } }] }), { status: 200 }))
    const { base } = await start({ fetcher: upstream, resolveHost: async () => ['93.184.216.34'] })
    await fetch(`${base}/admin/config`, { method: 'PUT', headers: auth, body: JSON.stringify({ llm: { apiKey: 'k', baseUrl: 'https://llm.example.net/v1', model: 'm' }, generation: { enabled: true }, knowledge: [{ title: '呼吸', keywords: '呼吸', answer: '慢慢呼吸。', source: '指南', reviewed: true }], courses: [] }) })
    for (let index = 1; index <= 13; index++) {
      const result = await (await fetch(`${base}/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Real-IP': `198.51.100.${index}` }, body: JSON.stringify({ kind: 'breath', question: '呼吸' }) })).json()
      expect(result.generated).toBe(true)
    }
    expect(upstream).toHaveBeenCalledTimes(13)
  })

  it('falls back when an upstream response exceeds the bounded payload size', async () => {
    const upstream = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: `建议[1]${'x'.repeat(70000)}` } }] }), { status: 200 }))
    const { base } = await start({ fetcher: upstream, resolveHost: async () => ['93.184.216.34'] })
    await fetch(`${base}/admin/config`, { method: 'PUT', headers: auth, body: JSON.stringify({ llm: { apiKey: 'k', baseUrl: 'https://llm.example.net/v1', model: 'm' }, generation: { enabled: true }, knowledge: [{ title: '呼吸', keywords: '呼吸', answer: '慢慢呼吸。', source: '指南', reviewed: true }], courses: [] }) })
    const result = await (await fetch(`${base}/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'breath', question: '呼吸' }) })).json()
    expect(result).toMatchObject({ generated: false, sources: [] })
  })

  it('encodes non-ASCII upload filenames and recognizes native HTTPS localhost', async () => {
    const native = vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true)
    vi.stubGlobal('location', new URL('https://localhost/'))
    expect(apiUrl('/api/config')).toBe('https://yangling.entermodetwo.com/api/config')
    native.mockRestore()
    vi.unstubAllGlobals()
    const originalFetch = globalThis.fetch
    const mocked = vi.fn(async (_url, options) => new Response(JSON.stringify({ url: '/api/audio/a.wav', name: 'a.wav' }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
    globalThis.fetch = mocked
    try { await uploadAudio(new File(['RIFFxxxxWAVE'], '养生音频.wav', { type: '' }), 't') } finally { globalThis.fetch = originalFetch }
    expect(mocked.mock.calls[0][1].headers['X-Filename']).toBe(encodeURIComponent('养生音频.wav'))
    expect(mocked.mock.calls[0][1].headers['Content-Type']).toBe('audio/wav')
  })

  it('keeps audio uploads alive beyond the default 12 second request timeout', async () => {
    vi.useFakeTimers()
    let resolveFetch
    const mocked = vi.fn((_url, options) => new Promise(resolve => {
      resolveFetch = () => resolve(new Response(JSON.stringify({ url: '/api/audio/a.wav', name: 'a.wav' }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
      expect(options.signal.aborted).toBe(false)
    }))
    vi.stubGlobal('fetch', mocked)
    try {
      const pending = uploadAudio(new File(['RIFFxxxxWAVE'], 'a.wav', { type: 'audio/wav' }), 't')
      await vi.advanceTimersByTimeAsync(13000)
      expect(mocked.mock.calls[0][1].signal.aborted).toBe(false)
      resolveFetch()
      await expect(pending).resolves.toMatchObject({ name: 'a.wav' })
    } finally {
      vi.unstubAllGlobals()
      vi.useRealTimers()
    }
  })
})
