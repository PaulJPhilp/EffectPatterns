/**
 * Path resolution: monorepo root from harness location, report dir, scenario dir names.
 */

import fs from 'node:fs'
import path from 'node:path'

const HARNESS_DIR = typeof import.meta !== 'undefined' && import.meta.dirname
  ? import.meta.dirname
  : __dirname

/** Default parent directory for scaffold output; must match scripts/scaffold-test-project.ts. */
export function defaultScaffoldRootDir(): string {
  return path.join(process.env.HOME ?? '/Users/paul', 'Projects', 'TestRepos')
}

/** Directory containing lifecycle-harness (scripts/lifecycle-harness). */
export function harnessDir(): string {
  return HARNESS_DIR
}

/** Effect-Patterns monorepo root: walk up from harness (src/) until we find root package.json. Throws if not found. */
export function findMonorepoRoot(): string {
  let dir = path.resolve(HARNESS_DIR, '..', '..', '..')
  const searchFrom = dir
  const stop = path.parse(dir).root
  while (dir !== stop) {
    const pkgPath = path.join(dir, 'package.json')
    try {
      const content = fs.readFileSync(pkgPath, 'utf-8')
      if (content.includes('effect-patterns-hub') || content.includes('"scaffold"')) {
        return dir
      }
    } catch {
      // ignore
    }
    dir = path.dirname(dir)
  }
  throw new Error(
    `Could not find Effect-Patterns monorepo root. Searched upward from: ${searchFrom}. Expected: package.json containing 'effect-patterns-hub' or "scaffold". Run the harness from the Effect-Patterns monorepo root (where package.json and scripts/ live).`
  )
}

/** Reports directory under lifecycle-harness (scripts/lifecycle-harness/reports). */
export function reportsDir(): string {
  return path.join(HARNESS_DIR, '..', 'reports')
}

/** Report filename: run-YYYYMMDD-HHmmss-seed-<seed>.json */
export function reportFilename(seed: number): string {
  const now = new Date()
  const Y = now.getFullYear()
  const M = String(now.getMonth() + 1).padStart(2, '0')
  const D = String(now.getDate()).padStart(2, '0')
  const h = String(now.getHours()).padStart(2, '0')
  const m = String(now.getMinutes()).padStart(2, '0')
  const s = String(now.getSeconds()).padStart(2, '0')
  return `run-${Y}${M}${D}-${h}${m}${s}-seed-${seed}.json`
}

/**
 * Scenario directory name: ep-life-YYYYMMDD-<seed>-s<idx>-<template>-<shortRand>
 */
export function scenarioDirName(
  seed: number,
  scenarioIndex: number,
  template: string,
  shortRand: string
): string {
  const now = new Date()
  const Y = now.getFullYear()
  const M = String(now.getMonth() + 1).padStart(2, '0')
  const D = String(now.getDate()).padStart(2, '0')
  return `ep-life-${Y}${M}${D}-${seed}-s${scenarioIndex}-${template}-${shortRand}`
}
