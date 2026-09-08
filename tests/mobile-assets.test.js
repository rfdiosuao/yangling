import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('motion reference asset', () => {
  it('uses a dedicated 334 by 339 demonstration photo instead of stretching the full mockup', () => {
    const png = readFileSync(new URL('../public/prototype/motion-demo.png', import.meta.url))
    expect(png.readUInt32BE(16)).toBe(334)
    expect(png.readUInt32BE(20)).toBe(339)
  })
})
