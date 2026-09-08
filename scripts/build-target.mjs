import { spawnSync } from 'node:child_process'
const target = process.argv[2]
if (!['web', 'android', 'pages'].includes(target)) throw new Error('Unknown build target')
const result = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--base', target === 'android' ? './' : target === 'pages' ? '/yangling/' : '/', '--outDir', target === 'web' ? 'dist-web' : 'dist'], { stdio: 'inherit' })
process.exit(result.status ?? 1)
