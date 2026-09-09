import {readFileSync,writeFileSync,existsSync} from 'node:fs'
import {randomBytes} from 'node:crypto'
const unit='/etc/systemd/system/yangling-api.service'
const text=existsSync(unit)?readFileSync(unit,'utf8'):''
const line=text.split('\n').find(s=>/^Environment="?YANGLING_ADMIN_TOKEN=/.test(s))
let token=line?.replace(/^Environment="?YANGLING_ADMIN_TOKEN=/,'').replace(/"$/,'').trim()
if(!token)token=randomBytes(32).toString('hex')
if(!/^[A-Za-z0-9_.\-]+$/.test(token))throw new Error('Existing credential needs manual migration; not overwritten')
writeFileSync('/etc/yangling/api.env',`YANGLING_ADMIN_TOKEN=${token}\nYANGLING_DATA_DIR=/var/lib/yangling\n`,{flag:'wx',mode:0o600})
