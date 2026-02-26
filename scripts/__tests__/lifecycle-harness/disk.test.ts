/**
 * Unit tests for lifecycle harness disk: dirSizeBytes, totalSizeBytes.
 */

import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  bytesToMb,
  dirSizeBytes,
  totalSizeBytes,
  totalSizeBytesIncludingNodeModules,
} from '../../lifecycle-harness/src/disk.js'

describe('dirSizeBytes', () => {
  it('returns 0 for non-existent or empty dir', () => {
    const tmp = path.join(import.meta.dirname, `disk-test-${Date.now()}`)
    expect(dirSizeBytes(tmp)).toBe(0)
  })

  it('sums file sizes and excludes node_modules', () => {
    const tmp = path.join(import.meta.dirname, `disk-test-${Date.now()}`)
    fs.mkdirSync(tmp, { recursive: true })
    fs.mkdirSync(path.join(tmp, 'node_modules'), { recursive: true })
    fs.writeFileSync(path.join(tmp, 'a.txt'), 'hello', 'utf-8')
    fs.writeFileSync(path.join(tmp, 'node_modules', 'big.js'), 'x'.repeat(1000), 'utf-8')
    try {
      const size = dirSizeBytes(tmp)
      expect(size).toBe(5)
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })
})

describe('totalSizeBytes', () => {
  it('sums multiple dirs', () => {
    const tmp = path.join(import.meta.dirname, `disk-test-${Date.now()}`)
    fs.mkdirSync(tmp, { recursive: true })
    const d1 = path.join(tmp, 'd1')
    const d2 = path.join(tmp, 'd2')
    fs.mkdirSync(d1, { recursive: true })
    fs.mkdirSync(d2, { recursive: true })
    fs.writeFileSync(path.join(d1, 'f'), 'ab', 'utf-8')
    fs.writeFileSync(path.join(d2, 'g'), 'c', 'utf-8')
    try {
      expect(totalSizeBytes([d1, d2])).toBe(3)
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })
})

describe('totalSizeBytesIncludingNodeModules', () => {
  it('includes node_modules in sum', () => {
    const tmp = path.join(import.meta.dirname, `disk-test-${Date.now()}`)
    fs.mkdirSync(tmp, { recursive: true })
    fs.writeFileSync(path.join(tmp, 'a.txt'), 'x', 'utf-8')
    fs.mkdirSync(path.join(tmp, 'node_modules'), { recursive: true })
    fs.writeFileSync(path.join(tmp, 'node_modules', 'pkg.js'), 'yy', 'utf-8')
    try {
      expect(totalSizeBytesIncludingNodeModules([tmp])).toBe(3)
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })
})

describe('bytesToMb', () => {
  it('converts bytes to MB', () => {
    expect(bytesToMb(1024 * 1024)).toBe(1)
    expect(bytesToMb(1024 * 1024 * 2.5)).toBe(2.5)
  })
})
