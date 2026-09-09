export function createVoiceCoach(){
  let candidate='',since=0,lastAt=-Infinity,lastMessage=''
  return(result,now)=>{
    const good=result&&!result.partial&&result.score>=90&&result.armGood&&result.relaxed&&result.aligned
    const message=good?'很好，动作到位，保持自然呼吸。':result?.hint||'请让全身进入画面，再慢慢开始。'
    if(candidate!==message){candidate=message;since=now;return null}
    if(now-since<2000||now-lastAt<12000||(message===lastMessage&&now-lastAt<30000))return null
    lastAt=now;lastMessage=message;return message
  }
}
