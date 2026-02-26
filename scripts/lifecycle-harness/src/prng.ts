/**
 * Deterministic PRNG for lifecycle harness.
 * All randomness (repo names, template/tool choice, mutation steps) uses this
 * so the same seed produces the same run.
 */

/** Mulberry32: fast, deterministic, good enough for harness. */
export function mulberry32(seed: number): () => number {
  return function next() {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** [0, max) integer. */
export function randomInt(rng: () => number, max: number): number {
  return Math.floor(rng() * max)
}

/** Pick one element from array. */
export function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[randomInt(rng, arr.length)]!
}

/** Shuffle array in-place (Fisher–Yates), returns same array. */
export function shuffle<T>(rng: () => number, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(rng, i + 1)
    ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
  }
  return arr
}

/** Random subset of size up to maxSize (or all if arr is smaller). */
export function randomSubset<T>(
  rng: () => number,
  arr: readonly T[],
  maxSize: number
): T[] {
  const copy = [...arr]
  shuffle(rng, copy)
  const size = Math.min(maxSize, copy.length, randomInt(rng, copy.length + 1) || 1)
  return copy.slice(0, size)
}

/** Integer in [min, max] inclusive. */
export function randomIntInclusive(rng: () => number, min: number, max: number): number {
  return min + randomInt(rng, max - min + 1)
}

/** Short alphanumeric suffix for repo names (e.g. a1b2c3). */
export function shortRand(rng: () => number, length = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let s = ''
  for (let i = 0; i < length; i++) s += chars[randomInt(rng, chars.length)]
  return s
}
