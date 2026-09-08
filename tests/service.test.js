import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createYanglingServer } from '../server/app.mjs'

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
  it('serves health and sanitized public config while protecting admin mutations', async () => {
    const { base } = await start()
    expect((await fetch(`${base}/health`)).status).toBe(200)
    expect((await fetch(`${base}/admin/config`)).status).toBe(401)
    const publicConfig = await (await fetch(`${base}/config`)).json()
    expect(publicConfig.llm.apiKey).toBeUndefined()
    expect(publicConfig.llm.configured).toBe(false)
    expect(publicConfig.knowledge.every(item => item.reviewed === false)).toBe(true)
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
  })

  it('rejects invalid audio signatures and unreviewed sources', async () => {
    const { base } = await start()
    expect((await fetch(`${base}/admin/audio`, { method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'audio/mpeg' }, body: 'x' })).status).toBe(400)
    expect((await fetch(`${base}/admin/audio`, { method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'audio/mpeg', 'X-Filename': 'bad.mp3' }, body: 'not mp3' })).status).toBe(415)
    const generated = await (await fetch(`${base}/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'question', question: '白露嗓子干' }) })).json()
    expect(generated.generated).toBe(false)
    expect(generated.sources).toEqual([])
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
})
