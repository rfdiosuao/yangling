import {expect,it} from 'vitest'
import {poseCue,recordCompletion,clampPetPosition,createPetCoach} from '../src/mobile/companion.js'
import {scorePose} from '../src/mobile/model.js'
it('prioritizes incomplete and correction states above high scores',()=>{
 expect(poseCue({score:99,partial:true})).toBe('pose_in_frame_01')
 expect(poseCue({score:99,armGood:false,relaxed:true,aligned:true})).toBe('pose_arms_01')
 expect(poseCue({score:99,armGood:true,relaxed:false,aligned:true})).toBe('pose_shoulders_01')
 expect(poseCue({score:99,armGood:true,relaxed:true,aligned:false})).toBe('pose_back_01')
 expect(poseCue({score:96,armGood:true,relaxed:true,aligned:true})).toBe('pose_excellent_01')
})
it('records real daily completions once and resets at a new date',()=>{
 const first=recordCompletion(null,'cup','2026-09-09')
 expect(first.cue).toBe('done_cup_01')
 expect(recordCompletion(first.record,'cup','2026-09-09').cue).toBeNull()
 expect(recordCompletion({date:'2026-09-09',items:['cup','move']},'breath','2026-09-09').cue).toBe('done_day_01')
 expect(recordCompletion(first.record,'move','2026-09-10').record.items).toEqual(['move'])
 expect(recordCompletion(first.record,'invalid','2026-09-09').cue).toBeNull()
})
it('constrains draggable pet to its viewport bounds',()=>{
 expect(clampPetPosition({x:-40,y:1000},300,600)).toEqual({x:0,y:600})
})
it('requires sustained quality and spaces feedback',()=>{
 const coach=createPetCoach(),good={score:96,armGood:true,relaxed:true,aligned:true}
 expect(coach(good,0)).toBeNull()
 expect(['pose_good_01','pose_good_02']).toContain(coach(good,2100))
 expect(coach(good,15000)).toBe('pose_excellent_01')
 expect(coach(good,33000)).toBeNull()
 expect(coach(good,46000)).toBe('pose_excellent_01')
})
it('uses action-specific correction rather than telling every user to lift arms',()=>{
 expect(poseCue({score:83,armGood:false,correction:'pose_shoulders_01'})).toBe('pose_shoulders_01')
 expect(poseCue({score:83,armGood:false,correction:'pose_elbows_level'})).toBe('pose_elbows_level')
})
it('maps real shoulder and bow geometry to the correct voice direction',()=>{
 const points=Array.from({length:33},()=>({x:0,y:0,visibility:1}))
 for(const [id,x,y] of [[11,40,40],[12,60,50],[13,40,20],[14,60,20],[15,40,0],[16,60,0],[23,40,80],[24,60,80]])points[id]={x,y,visibility:1}
 expect(poseCue(scorePose(points,2))).toBe('pose_shoulders_01')
 expect(poseCue(scorePose(points,1))).toBe('pose_elbows_level')
 points[12].y=40
 const coach=createPetCoach(),real=scorePose(points,0)
 coach(real,0)
 expect(['pose_good_01','pose_good_02']).toContain(coach(real,2100))
 expect(coach(real,15000)).toBe('pose_excellent_01')
})
