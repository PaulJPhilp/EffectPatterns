/**
 * Unit tests for lifecycle harness args: parseArgs with given argv.
 */

import { describe, expect, it } from 'vitest'
import { parseArgs } from '../../lifecycle-harness/src/args.js'

describe('parseArgs', () => {
  it('returns help mode for --help', () => {
    const out = parseArgs(['node', 'harness', '--help'])
    expect(out.mode).toBe('help')
  })

  it('returns help mode for -h', () => {
    const out = parseArgs(['node', 'harness', '-h'])
    expect(out.mode).toBe('help')
  })

  it('returns version mode for --version', () => {
    const out = parseArgs(['node', 'harness', '--version'])
    expect(out.mode).toBe('version')
  })

  it('returns run mode with defaults when only node and script', () => {
    const out = parseArgs(['node', 'scripts/lifecycle-harness/src/index.ts'])
    expect(out.mode).toBe('run')
    if (out.mode === 'run') {
      expect(typeof out.seed).toBe('number')
      expect(out.scenarios).toBe(10)
      expect(out.budgetMinutes).toBe(14)
      expect(out.scenarioTimeoutSeconds).toBe(90)
      expect(out.diskBudgetMb).toBe(1024)
      expect(out.commits).toBe('minimal')
      expect(out.verbose).toBe(false)
      expect(out.dryRun).toBe(false)
      expect(out.epBin).toBe('ep')
      expect(out.keepLastN).toBeUndefined()
    }
  })

  it('parses --seed', () => {
    const out = parseArgs(['node', 'harness', '--seed', '42'])
    expect(out.mode).toBe('run')
    if (out.mode === 'run') expect(out.seed).toBe(42)
  })

  it('parses --scenarios', () => {
    const out = parseArgs(['node', 'harness', '--seed', '1', '--scenarios', '3'])
    expect(out.mode).toBe('run')
    if (out.mode === 'run') expect(out.scenarios).toBe(3)
  })

  it('parses --only-scenario', () => {
    const out = parseArgs(['node', 'harness', '--seed', '1', '--only-scenario', '2'])
    expect(out.mode).toBe('run')
    if (out.mode === 'run') expect(out.onlyScenario).toBe(2)
  })

  it('ignores negative --only-scenario', () => {
    const out = parseArgs(['node', 'harness', '--seed', '1', '--only-scenario', '-1'])
    expect(out.mode).toBe('run')
    if (out.mode === 'run') expect(out.onlyScenario).toBeUndefined()
  })

  it('parses --commits none', () => {
    const out = parseArgs(['node', 'harness', '--seed', '1', '--commits', 'none'])
    expect(out.mode).toBe('run')
    if (out.mode === 'run') expect(out.commits).toBe('none')
  })

  it('parses --verbose and --dry-run', () => {
    const out = parseArgs(['node', 'harness', '--seed', '1', '--verbose', '--dry-run'])
    expect(out.mode).toBe('run')
    if (out.mode === 'run') {
      expect(out.verbose).toBe(true)
      expect(out.dryRun).toBe(true)
    }
  })

  it('parses --ep-bin', () => {
    const out = parseArgs(['node', 'harness', '--seed', '1', '--ep-bin', '/usr/local/bin/ep'])
    expect(out.mode).toBe('run')
    if (out.mode === 'run') expect(out.epBin).toBe('/usr/local/bin/ep')
  })

  it('parses --keep-last-n', () => {
    const out = parseArgs(['node', 'harness', '--seed', '1', '--keep-last-n', '5'])
    expect(out.mode).toBe('run')
    if (out.mode === 'run') expect(out.keepLastN).toBe(5)
  })

  it('--keep-last-n with invalid value defaults to 5', () => {
    const out = parseArgs(['node', 'harness', '--seed', '1', '--keep-last-n', 'x'])
    expect(out.mode).toBe('run')
    if (out.mode === 'run') expect(out.keepLastN).toBe(5)
  })

  it('--keep-last-n 0 yields undefined', () => {
    const out = parseArgs(['node', 'harness', '--seed', '1', '--keep-last-n', '0'])
    expect(out.mode).toBe('run')
    if (out.mode === 'run') expect(out.keepLastN).toBeUndefined()
  })

  it('returns analyze mode for --analyze with path', () => {
    const out = parseArgs(['node', 'harness', '--analyze', 'reports/run-1-seed-1.json'])
    expect(out.mode).toBe('analyze')
    if (out.mode === 'analyze') expect(out.reportPath).toBe('reports/run-1-seed-1.json')
  })
})
