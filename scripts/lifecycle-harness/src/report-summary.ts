/**
 * Built-in report summary: coverage matrix, soft-fail by command type, template distribution.
 */

import type { CommandRecord, CoverageChecklist, RunReport, ScenarioRecord } from './report.js'
import { TEMPLATES } from './types.js'

/** Short label for grouping commands (e.g. "list", "skills validate", "git commit"). */
export function commandKey(record: CommandRecord): string {
  const args = record.args
  const isEp = record.resolvedBinary.endsWith('ep') || args[0]?.includes('ep-cli')
  if (isEp) {
    const offset = args[0]?.includes('ep-cli') ? 1 : 0
    const a = args.slice(offset)
    const first = a[0]
    if (first === '--completions') return 'completions'
    if (first === 'list') return 'list'
    if (first === 'search') return 'search'
    if (first === 'show') return 'show'
    if (first === 'install' && a[1] === 'list') return 'install list'
    if (first === 'install' && a[1] === 'add') return 'install add'
    if (first === 'skills' && a[1] === 'list') return 'skills list'
    if (first === 'skills' && a[1] === 'preview') return 'skills preview'
    if (first === 'skills' && a[1] === 'validate') return 'skills validate'
    if (first === 'skills' && a[1] === 'stats') return 'skills stats'
    if (first === '--version' || first === '--help') return first
    return first ?? 'ep'
  }
  if (record.resolvedBinary === 'git') {
    if (args[0] === 'commit') return 'git commit'
    if (args[0] === 'add') return 'git add'
    return `git ${args[0] ?? '?'}`
  }
  if (record.resolvedBinary === 'bun' && args[0] === 'run') {
    if (args[1] === 'scaffold') return 'scaffold'
    if (args[1] === 'dev') return 'bun run dev'
    if (args[1] === 'test') return 'bun run test'
    return `bun run ${args[1] ?? '?'}`
  }
  return record.resolvedBinary
}

function coverageMatrix(attempted: CoverageChecklist, succeeded: CoverageChecklist): string {
  const lines: string[] = []
  const keys = Object.keys(attempted) as (keyof CoverageChecklist)[]
  const maxLen = Math.max(...keys.map((k) => k.length))
  for (const k of keys) {
    const a = attempted[k] ? 'Y' : 'N'
    const s = succeeded[k] ? 'Y' : 'N'
    const gap = attempted[k] && !succeeded[k] ? ' (gap)' : ''
    lines.push(`  ${k.padEnd(maxLen)}  attempted: ${a}  succeeded: ${s}${gap}`)
  }
  return lines.join('\n')
}

/** Build soft-fail counts by command key (for report JSON). Sorted by count descending for stable output. */
export function getSoftFailByCommand(scenarios: ScenarioRecord[]): Record<string, number> {
  const counts = new Map<string, number>()
  for (const scenario of scenarios) {
    for (const cmd of scenario.commands) {
      if (cmd.outcome !== 'soft-fail') continue
      const key = commandKey(cmd)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }
  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1])
  return Object.fromEntries(entries)
}

function softFailCounts(report: RunReport): Map<string, number> {
  return new Map(Object.entries(getSoftFailByCommand(report.scenarios)))
}

function templateDistribution(report: RunReport): Map<string, number> {
  const counts = new Map<string, number>()
  for (const scenario of report.scenarios) {
    const t = scenario.template
    counts.set(t, (counts.get(t) ?? 0) + 1)
  }
  return counts
}

/** Print coverage matrix, soft-fail breakdown, and template distribution to stdout. */
export function printReportSummary(report: RunReport): void {
  console.log('\n--- Report summary ---')
  console.log('\nCoverage (per surface):')
  console.log(coverageMatrix(report.coverageAttempted, report.coverageSucceeded))

  const softFail = softFailCounts(report)
  if (softFail.size > 0) {
    console.log('\nSoft-fail counts by command:')
    const entries = [...softFail.entries()].sort((a, b) => b[1] - a[1])
    const maxKeyLen = Math.max(...entries.map(([k]) => k.length))
    for (const [key, count] of entries) {
      console.log(`  ${key.padEnd(maxKeyLen)}  ${count}`)
    }
  }

  const templates = templateDistribution(report)
  if (templates.size > 0) {
    console.log('\nTemplates (scenarios per template):')
    for (const t of TEMPLATES) {
      const n = templates.get(t)
      if (n !== undefined) console.log(`  ${t}  ${n}`)
    }
    for (const [t, n] of templates) {
      if (!TEMPLATES.includes(t as (typeof TEMPLATES)[number])) console.log(`  ${t}  ${n}`)
    }
  }

  console.log('')
}
