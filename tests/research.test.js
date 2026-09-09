import {it,expect} from 'vitest'
import {searchResearch,researchStats} from '../server/research.mjs'
it('retrieves imported research with distinct source titles without claiming medical review',()=>{
  const hits=searchResearch('八段锦有哪些研究？')
  expect(hits.length).toBeGreaterThan(0)
  expect(new Set(hits.map(h=>h.title)).size).toBe(hits.length)
  expect(hits.every(h=>h.reviewed===false&&h.id&&h.body)).toBe(true)
  expect(researchStats().chunks).toBeGreaterThan(8000)
})
it('leaves unrelated questions unmatched',()=>{expect(searchResearch('火星什么时候下雨')).toEqual([])})
