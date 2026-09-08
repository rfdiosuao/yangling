import { describe, expect, it } from 'vitest'
import { parseMobileRoute } from '../src/mobile/route.js'

describe('hidden administration route', () => {
  it('opens the admin only on the dedicated hash and keeps it out of normal navigation', () => {
    expect(parseMobileRoute('#admin')).toEqual({ tab: 'home', admin: true })
    expect(parseMobileRoute('#knowledge')).toEqual({ tab: 'knowledge', admin: false })
    expect(parseMobileRoute('#anything')).toEqual({ tab: 'home', admin: false })
  })
})
