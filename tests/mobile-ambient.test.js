import { describe, expect, it } from 'vitest'
import { AMBIENT_PRESETS, getAmbientPreset } from '../src/mobile/ambient-audio.js'

describe('ritual background music', () => {
  it('provides a calm music preset for every home ritual', () => {
    expect(Object.keys(AMBIENT_PRESETS)).toEqual(['cup', 'move', 'breath'])
    expect(getAmbientPreset('breath').tempo).toBeLessThanOrEqual(60)
    expect(getAmbientPreset('cup').notes.length).toBeGreaterThan(2)
  })
})
