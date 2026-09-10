import {randomBytes,createHash} from 'node:crypto'
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises'
import {join} from 'node:path'
import {validDate} from '../src/mobile/growth.js'
const hash=s=>createHash('sha256').update(s).digest('hex'),id=()=>randomBytes(16).toString('hex')
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})}
export function createFamilyStore(dataDir){
 let queue=Promise.resolve();const rates=new Map()
 return function transact(action,token,input={},address='unknown'){
  const run=queue.then(async()=>{
   const now=Date.now(),key=action==='register'||action==='join'?address:token?hash(token):address,rate=rates.get(key)||{at:now,n:0};if(now-rate.at>60000){rate.at=now;rate.n=0}if(++rate.n>60)fail('操作太频繁，请稍后再试',429);rates.set(key,rate);if(rates.size>2000)for(const [k,v]of rates)if(now-v.at>60000)rates.delete(k)
   await mkdir(dataDir,{recursive:true});const file=join(dataDir,'family.json');let db
   try{db=JSON.parse(await readFile(file,'utf8'))}catch(e){if(e.code!=='ENOENT')throw e;db={users:{},invites:{},links:{}}}
   if(!db.users||!db.invites||!db.links)throw new Error('invalid family store')
   for(const [code,invite]of Object.entries(db.invites))if(invite.expires<now)delete db.invites[code]
   for(const link of Object.values(db.links))link.messages=link.messages.filter(m=>now-m.at<30*86400000).slice(-100)
   const uid=token&&Object.keys(db.users).find(k=>db.users[k].token===hash(token)),user=db.users[uid];let result={ok:true}
   const linked=()=>Object.values(db.links).filter(l=>l.members.includes(uid)),name=String(input.name||'').trim()
   if(action==='register'){
    if(!name||name.length>24)fail('请填写 1–24 字昵称');const secret=randomBytes(32).toString('hex'),newId=id();db.users[newId]={token:hash(secret),name};result={token:secret}
   }else{
    if(!user)fail('家庭身份无效，请重新开启家庭陪伴',401)
    if(action==='state')result={name:user.name,links:linked().map(l=>({...l,peer:db.users[l.members.find(x=>x!==uid)].name,mine:l.owner===uid,summary:l.summaries?.[l.members.find(x=>x!==uid)]||null,messages:l.messages.map(m=>({...m,mine:m.sender===uid})),members:undefined,summaries:undefined,owner:undefined})),invite:Object.entries(db.invites).find(([,v])=>v.owner===uid)?.[0]||null}
    else if(action==='invite'){
     if(linked().length>=5)fail('最多绑定 5 位家人');for(const [c,v]of Object.entries(db.invites))if(v.owner===uid)delete db.invites[c];const code=randomBytes(6).toString('hex').toUpperCase();db.invites[code]={owner:uid,expires:now+600000};result={code}
    }else if(action==='join'){
     const code=String(input.code||'').trim().toUpperCase(),invite=db.invites[code];if(!invite)fail('邀请码无效或已过期');if(invite.owner===uid)fail('不能绑定自己');if(linked().some(l=>l.members.includes(invite.owner)))fail('已存在绑定或待确认请求');if(linked().length>=5||Object.values(db.links).filter(l=>l.members.includes(invite.owner)).length>=5)fail('家人数量已满');const linkId=id();db.links[linkId]={id:linkId,owner:invite.owner,members:[invite.owner,uid],status:'pending',messages:[],summaries:{}};delete db.invites[code]
    }else if(action==='sync'){
     if(!validDate(input.date)||Math.abs(now-Date.parse(input.date+'T12:00:00Z'))>2*86400000)fail('打卡日期无效');const items=['cup','move','breath'].filter(x=>Array.isArray(input.items)&&input.items.includes(x));for(const l of linked())if(l.status==='active')l.summaries[uid]={date:input.date,items,updated:now}
    }else{
     const link=db.links[input.link];if(!link||!link.members.includes(uid))fail('绑定不存在',404)
     if(action==='remove')delete db.links[input.link]
     else if(action==='confirm'){if(link.owner!==uid||link.status!=='pending')fail('无法确认此请求',403);link.status='active'}
     else if(link.status!=='active')fail('请等待双方确认',403)
     else if(action==='read'){for(const m of link.messages)if(m.sender!==uid)m.read=true}
     else if(action==='message'){
      const text=String(input.text||'').trim(),messageId=String(input.id||'');if(!text||text.length>120||! /^[a-zA-Z0-9-]{8,80}$/.test(messageId))fail('留言需为 1–120 字');if(!link.messages.some(m=>m.id===messageId&&m.sender===uid)){if(link.messages.some(m=>m.sender===uid&&now-m.at<3000))fail('请稍候再发送',429);link.messages.push({id:messageId,text,sender:uid,at:now,read:false});link.messages=link.messages.slice(-100)}
     }else fail('操作不存在',404)
    }
   }
   const temp=file+'.tmp';await writeFile(temp,JSON.stringify(db),{mode:0o600});await rename(temp,file);return result
  });queue=run.catch(()=>{});return run
 }
}
