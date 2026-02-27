/**
 * Detect whether a scaffolded repo is in a "broken" state from lifecycle mutations
 * (so dev/test would fail). Used to skip dev or run test with expectFailure.
 */

import fs from 'node:fs'
import path from 'node:path'

/** True if lifecycle mutations have left the project in a broken state (dev/test would fail). */
export function isCodeCurrentlyBroken(repoPath: string): boolean {
  const srcDir = path.join(repoPath, 'src')
  if (!fs.existsSync(srcDir)) return false
  for (const name of fs.readdirSync(srcDir)) {
    if (!name.endsWith('.ts') || name.endsWith('.d.ts')) continue
    const content = fs.readFileSync(path.join(srcDir, name), 'utf-8')
    if (content.includes('BAD_IMPORT_PLACEHOLDER')) return true
    if (name.includes('.test.') && content.includes('expect(1).toBe(2)')) return true
  }
  return false
}
