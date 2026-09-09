import {expect,it} from 'vitest'
import {createVoiceCoach} from '../src/mobile/voice-coach.js'
it('waits for sustained pose quality and spaces repeated encouragement',()=>{
  const coach=createVoiceCoach()
  const good={score:95,partial:false,armGood:true,relaxed:true,aligned:true,hint:'动作到位'}
  expect(coach(good,0)).toBeNull()
  expect(coach(good,1000)).toBeNull()
  expect(coach(good,2500)).toContain('很好')
  expect(coach(good,3500)).toBeNull()
  expect(coach(good,20000)).toBeNull()
  expect(coach(good,33000)).toContain('很好')
})
it('does not praise partial detections and repeats correction only after cooldown',()=>{
  const coach=createVoiceCoach(),partial={score:95,partial:true,hint:'另一侧入镜'}
  coach(partial,0)
  expect(coach(partial,2500)).toContain('另一侧')
  expect(coach(partial,4000)).toBeNull()
  const bad={score:60,partial:false,hint:'手臂再抬高一点'}
  coach(bad,6000)
  expect(coach(bad,8500)).toBeNull()
  expect(coach(bad,15000)).toBe('手臂再抬高一点')
})
