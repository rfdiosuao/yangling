// Run on the server as root; read the API key from stdin, never print it.
import { readFile, writeFile, rename, chmod } from 'node:fs/promises'
let key = ''
for await (const chunk of process.stdin) key += chunk
key = key.trim()
if (!/^sk-[A-Za-z0-9_-]{16,200}$/.test(key)) throw new Error('Invalid key format')
const path = '/etc/yangling/api.env'
const original = await readFile(path, 'utf8')
const next = original.split('\n').filter(line => !/^BAICHUAN_MEDICAL_API_KEY=/.test(line)).join('\n').trimEnd() + `\nBAICHUAN_MEDICAL_API_KEY=${key}\n`
await writeFile(`${path}.baichuan.next`, next, { mode: 0o600 })
await chmod(`${path}.baichuan.next`, 0o600)
await rename(`${path}.baichuan.next`, path)
console.log('Baichuan credential configured; existing settings preserved.')
