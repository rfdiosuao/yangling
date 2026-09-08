import { describe, it, expect } from 'vitest'
import { selectAudio } from '../src/mobile/audio-library.js'
import { reminderSlots, normalizeReminder, reminderMessage } from '../src/mobile/reminder-schedule.js'

describe('audio rotation', () => {
  const tracks = [{id:'a',enabled:true,url:'https://x/a.mp3'},{id:'b',enabled:true,url:'https://x/b.mp3'},{id:'c',enabled:false,url:'https://x/c.mp3'}]
  it('excludes disabled items and avoids repeats until the pool is exhausted', () => {
    expect(selectAudio(tracks, ['a'], () => 0).id).toBe('b')
    expect(selectAudio(tracks, ['a','b'], () => 0).id).toBe('a')
    expect(selectAudio([], [], () => 0)).toBeNull()
  })
})
describe('reminder scheduling', () => {
  it('restricts interval reminders to daytime and excludes quiet hours across midnight', () => {
    expect(reminderSlots({enabled:true,intervalMin:60,start:'08:00',end:'11:00',quietStart:'22:00',quietEnd:'09:00'})).toEqual(['09:00','10:00'])
  })
  it('deduplicates fixed times and suppresses disabled schedules', () => {
    expect(reminderSlots({enabled:true,scheduleMode:'fixed',times:['09:00','09:00','23:00'],quietStart:'22:00',quietEnd:'08:00'})).toEqual(['09:00'])
    expect(reminderSlots({enabled:false})).toEqual([])
  })
  it('normalizes invalid intervals and keeps health state out of notification text', () => {
    expect(normalizeReminder({intervalMin:-1}).intervalMin).toBe(45)
    const msg=reminderMessage({activities:['breath'],state:'肩颈紧'},'小王',0)
    expect(msg.route).toBe('home')
    expect(msg.ritual).toBe('breath')
    expect(msg.title).toContain('小王')
    expect(msg.body).not.toContain('肩颈紧')
  })
})
