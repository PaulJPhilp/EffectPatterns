/**
 * Unit tests for report-summary: commandKey and printReportSummary.
 */


// biome-ignore assist/source/organizeImports: <>
import  { describe, expect, it } from 'vitest'
import { commandKey, printReportSummary } from '../../lifecycle-harness/src/report-summary.js'
import type { CommandRecord, RunReport } from '../../lifecycle-harness/src/report.js'

function record(overrides: Partial<CommandRecord> & { args: string[] }): CommandRecord {
  return {
    resolvedBinary: 'ep',
    cwd: '/tmp',
    envOverrides: {},
    exitCode: 0,
    durationMs: 1,
    outcome: 'success',
    ...overrides,
  }
}

describe('commandKey', () => {
  it('returns ep command keys', () => {
    expect(commandKey(record({ args: ['list'] }))).toBe('list')
    expect(commandKey(record({ args: ['search', 'retry'] }))).toBe('search')
    expect(commandKey(record({ args: ['show', 'retry-with-backoff'] }))).toBe('show')
    expect(commandKey(record({ args: ['install', 'list'] }))).toBe('install list')
    expect(commandKey(record({ args: ['install', 'add', '--tool', 'cursor'] }))).toBe('install add')
    expect(commandKey(record({ args: ['skills', 'validate'] }))).toBe('skills validate')
    expect(commandKey(record({ args: ['--completions', 'sh'] }))).toBe('completions')
  })

  it('handles ep-cli path prefix', () => {
    expect(commandKey(record({ args: ['/path/ep-cli/src/index.ts', 'list'] }))).toBe('list')
  })

  it('returns git and bun keys', () => {
    expect(commandKey(record({ resolvedBinary: 'git', args: ['commit', '-m', 'x'] }))).toBe('git commit')
    expect(commandKey(record({ resolvedBinary: 'bun', args: ['run', 'scaffold', 'dir'] }))).toBe('scaffold')
    expect(commandKey(record({ resolvedBinary: 'bun', args: ['run', 'dev'] }))).toBe('bun run dev')
    expect(commandKey(record({ resolvedBinary: 'bun', args: ['run', 'test'] }))).toBe('bun run test')
  })
})

describe('printReportSummary', () => {
  it('prints without throwing for minimal report', () => {
    const report: RunReport = {
      seed: 1,
      startTime: '',
      endTime: '',
      runtimeMs: 0,
      scenarios: [],
      totalCommandsAttempted: 0,
      totalSuccess: 0,
      totalSoftFail: 0,
      totalHardFail: 0,
      diskUsageBytes: 0,
      diskUsageMb: 0,
      firstFailingScenario: null,
      coverageAttempted: {
        list: false,
        search: false,
        show: false,
        installList: false,
        installAdd: false,
        skillsList: false,
        skillsPreview: false,
        skillsValidate: false,
        skillsStats: false,
        completions: false,
      },
      coverageSucceeded: {
        list: false,
        search: false,
        show: false,
        installList: false,
        installAdd: false,
        skillsList: false,
        skillsPreview: false,
        skillsValidate: false,
        skillsStats: false,
        completions: false,
      },
    }
    expect(() => printReportSummary(report)).not.toThrow()
  })

  it('includes coverage and template sections for non-empty report', () => {
    const report: RunReport = {
      seed: 1,
      startTime: '',
      endTime: '',
      runtimeMs: 0,
      scenarios: [
        {
          repoPath: '/tmp/s0',
          template: 'basic',
          tools: [],
          scenarioIndex: 0,
          status: 'success',
          commands: [
            record({ args: ['list'], outcome: 'success' }),
            record({ args: ['skills', 'validate'], outcome: 'soft-fail' }),
          ],
        },
      ],
      totalCommandsAttempted: 2,
      totalSuccess: 1,
      totalSoftFail: 1,
      totalHardFail: 0,
      diskUsageBytes: 0,
      diskUsageMb: 0,
      firstFailingScenario: null,
      coverageAttempted: { list: true, search: false, show: false, installList: false, installAdd: false, skillsList: false, skillsPreview: false, skillsValidate: true, skillsStats: false, completions: false },
      coverageSucceeded: { list: true, search: false, show: false, installList: false, installAdd: false, skillsList: false, skillsPreview: false, skillsValidate: false, skillsStats: false, completions: false },
    }
    const logs: string[] = []
    const orig = console.log
    console.log = (...args: unknown[]) => logs.push(args.map(String).join(' '))
    try {
      printReportSummary(report)
      const out = logs.join('\n')
      expect(out).toContain('Coverage (per surface)')
      expect(out).toContain('list')
      expect(out).toContain('Soft-fail counts')
      expect(out).toContain('skills validate')
      expect(out).toContain('Templates')
      expect(out).toContain('basic')
    } finally {
      console.log = orig
    }
  })
})
