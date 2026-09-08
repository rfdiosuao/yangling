// 下载 MediaPipe pose_landmarker_lite.task 到 public/mediapipe/
import { writeFile, mkdir } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'

const URLS = [
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
  'https://raw.githubusercontent.com/alesaccoia/mediapipe-models/main/pose_landmarker_lite/pose_landmarker_lite.task',
]
const DEST = 'public/mediapipe/pose_landmarker_lite.task'

await mkdir('public/mediapipe', { recursive: true })

for (const url of URLS) {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 90_000)
    const res = await fetch(url, { signal: ctrl.signal })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    await writeFile(DEST, buf)
    console.log(`OK ${url} -> ${buf.length} bytes`)
    process.exit(0)
  } catch (e) {
    console.log(`FAIL ${url}: ${e.message}`)
  }
}
console.log('all mirrors failed')
process.exit(1)
