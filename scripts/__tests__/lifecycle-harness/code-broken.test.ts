/**
 * Unit tests for code-broken: isCodeCurrentlyBroken.
 */

import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { isCodeCurrentlyBroken } from '../../lifecycle-harness/src/code-broken.js'

function withTmpDir(fn: (dir: string) => void): void {
  const tmp = path.join(import.meta.dirname, `code-broken-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  fs.mkdirSync(path.join(tmp, 'src'), { recursive: true })
  try {
    fn(tmp)
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
}

describe('isCodeCurrentlyBroken', () => {
  it('returns false when src does not exist', () => {
    const tmp = path.join(import.meta.dirname, `code-broken-no-src-${Date.now()}`)
    fs.mkdirSync(tmp, { recursive: true })
    try {
      expect(isCodeCurrentlyBroken(tmp)).toBe(false)
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })

  it('returns false when src exists but has no broken markers', () => {
    withTmpDir((dir) => {
      fs.writeFileSync(path.join(dir, 'src', 'index.ts'), 'import { Effect } from "effect"\n', 'utf-8')
      expect(isCodeCurrentlyBroken(dir)).toBe(false)
    })
  })

  it('returns true when a .ts file contains BAD_IMPORT_PLACEHOLDER', () => {
    withTmpDir((dir) => {
      fs.writeFileSync(
        path.join(dir, 'src', 'index.ts'),
        'import { Effect } from "BAD_IMPORT_PLACEHOLDER"\n',
        'utf-8'
      )
      expect(isCodeCurrentlyBroken(dir)).toBe(true)
    })
  })

  it('returns true when a test file contains expect(1).toBe(2)', () => {
    withTmpDir((dir) => {
      fs.writeFileSync(path.join(dir, 'src', 'index.ts'), 'export const x = 1\n', 'utf-8')
      fs.writeFileSync(
        path.join(dir, 'src', 'foo.test.ts'),
        'import { expect, it } from "vitest"\nit("fails", () => expect(1).toBe(2))\n',
        'utf-8'
      )
      expect(isCodeCurrentlyBroken(dir)).toBe(true)
    })
  })

  it('returns false when test file has expect(1).toBe(1) (fixed)', () => {
    withTmpDir((dir) => {
      fs.writeFileSync(path.join(dir, 'src', 'index.ts'), 'export const x = 1\n', 'utf-8')
      fs.writeFileSync(
        path.join(dir, 'src', 'foo.test.ts'),
        'import { expect, it } from "vitest"\nit("passes", () => expect(1).toBe(1))\n',
        'utf-8'
      )
      expect(isCodeCurrentlyBroken(dir)).toBe(false)
    })
  })

  it('ignores .d.ts files', () => {
    withTmpDir((dir) => {
      fs.writeFileSync(path.join(dir, 'src', 'index.ts'), 'export const x = 1\n', 'utf-8')
      fs.writeFileSync(
        path.join(dir, 'src', 'types.d.ts'),
        'declare module "BAD_IMPORT_PLACEHOLDER"\n',
        'utf-8'
      )
      expect(isCodeCurrentlyBroken(dir)).toBe(false)
    })
  })
})
