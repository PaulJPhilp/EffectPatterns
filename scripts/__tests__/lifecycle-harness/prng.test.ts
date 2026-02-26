/**
 * Unit tests for lifecycle harness PRNG: determinism and range.
 */

import { describe, expect, it } from 'vitest'
import {
  mulberry32,
  pick,
  randomInt,
  randomIntInclusive,
  randomSubset,
  shortRand,
} from '../../lifecycle-harness/src/prng.js'

describe('mulberry32', () => {
  it('is deterministic: same seed yields same sequence', () => {
    const rng1 = mulberry32(12345)
    const rng2 = mulberry32(12345)
    for (let i = 0; i < 20; i++) {
      expect(rng1()).toBe(rng2())
    }
  })

  it('returns values in [0, 1)', () => {
    const rng = mulberry32(999)
    for (let i = 0; i < 100; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('different seeds yield different sequences', () => {
    const a = mulberry32(1)
    const b = mulberry32(2)
    const valsA = [a(), a(), a()]
    const valsB = [b(), b(), b()]
    expect(valsA).not.toEqual(valsB)
  })
})

describe('randomInt', () => {
  it('returns integer in [0, max)', () => {
    const rng = mulberry32(42)
    for (let i = 0; i < 50; i++) {
      const v = randomInt(rng, 10)
      expect(Number.isInteger(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(10)
    }
  })
})

describe('pick', () => {
  it('returns one element from array', () => {
    const rng = mulberry32(7)
    const arr = ['a', 'b', 'c']
    const v = pick(rng, arr)
    expect(arr).toContain(v)
  })
})

describe('randomIntInclusive', () => {
  it('returns integer in [min, max] inclusive', () => {
    const rng = mulberry32(11)
    const seen = new Set<number>()
    for (let i = 0; i < 200; i++) {
      const v = randomIntInclusive(rng, 5, 10)
      expect(Number.isInteger(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(5)
      expect(v).toBeLessThanOrEqual(10)
      seen.add(v)
    }
    expect(seen.size).toBe(6)
  })
})

describe('shortRand', () => {
  it('returns string of requested length', () => {
    const rng = mulberry32(13)
    const s = shortRand(rng, 6)
    expect(s.length).toBe(6)
    expect(s).toMatch(/^[a-z0-9]+$/)
  })
})

describe('randomSubset', () => {
  it('returns subset of array', () => {
    const rng = mulberry32(17)
    const arr = [1, 2, 3, 4, 5]
    const sub = randomSubset(rng, arr, 3)
    expect(sub.length).toBeLessThanOrEqual(3)
    for (const x of sub) expect(arr).toContain(x)
  })

  it('returns empty array when input is empty', () => {
    const rng = mulberry32(19)
    expect(randomSubset(rng, [], 5)).toEqual([])
  })
})
