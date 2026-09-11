// Run on the production host; stdin is an audio-only manifest, never LLM settings.
import {readFile,writeFile,copyFile,rename,stat,chown} from 'node:fs/promises'
const parts=[];for await(const chunk of process.stdin)parts.push(chunk)
const tracks=JSON.parse(Buffer.concat(parts).toString('utf8').replace(/^\uFEFF/,''))
if(!Array.isArray(tracks)||!tracks.length)throw new Error('Empty manifest')
for(const t of tracks){if(!/^audio\/meditation\/[a-z-]+\.mp3$/.test(t.url))throw new Error('Invalid path');await stat('/var/www/yangling/'+t.url)}
const file='/var/lib/yangling/config.json',config=JSON.parse(await readFile(file,'utf8'))
await copyFile(file,file+'.before-meditation-'+Date.now())
const previous=config.audio||[]
config.audio=[...previous,...tracks.filter(t=>!previous.some(p=>p.id===t.id)).map(t=>({...t,url:'https://yangling.entermodetwo.com/'+t.url}))]
const owner=await stat(file)
await writeFile(file+'.meditation-next',JSON.stringify(config,null,2),{mode:0o600});await chown(file+'.meditation-next',owner.uid,owner.gid);await rename(file+'.meditation-next',file)
console.log(JSON.stringify({audioCount:config.audio.length,otherSettingsPreserved:true}))
