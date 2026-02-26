/**
 * Recursive directory size for disk budget.
 */

import fs from 'node:fs'
import path from 'node:path'

function dirSizeRecursive(
  dirPath: string,
  excludeDir: (dirName: string) => boolean
): number {
  let total = 0
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    for (const e of entries) {
      const full = path.join(dirPath, e.name)
      if (e.isDirectory()) {
        if (excludeDir(e.name)) continue
        total += dirSizeRecursive(full, excludeDir)
      } else {
        try {
          total += fs.statSync(full).size
        } catch {
          // skip
        }
      }
    }
  } catch {
    // return 0 on permission etc.
  }
  return total
}

/** Recursive size in bytes, excluding node_modules. */
export function dirSizeBytes(dirPath: string): number {
  return dirSizeRecursive(dirPath, (name) => name === 'node_modules')
}

/** Sum sizes of multiple directories (excluding node_modules in each). */
export function totalSizeBytes(dirPaths: string[]): number {
  return dirPaths.reduce((sum, d) => sum + dirSizeBytes(d), 0)
}

/** Recursive size in bytes, including node_modules (for soft warning only). */
export function dirSizeBytesIncludingNodeModules(dirPath: string): number {
  return dirSizeRecursive(dirPath, () => false)
}

/** Sum sizes including node_modules (for soft disk warning). */
export function totalSizeBytesIncludingNodeModules(dirPaths: string[]): number {
  return dirPaths.reduce((sum, d) => sum + dirSizeBytesIncludingNodeModules(d), 0)
}

export function bytesToMb(bytes: number): number {
  return bytes / (1024 * 1024)
}
