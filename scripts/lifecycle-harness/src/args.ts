/**
 * Minimal argument parser for lifecycle harness (no external deps).
 */

import { defaultScaffoldRootDir } from './paths.js'

export interface HarnessArgsRun {
  mode: 'run'
  seed: number
  scenarios: number
  /** 0-based scenario index to run alone (same seed = same scenario). */
  onlyScenario?: number
  budgetMinutes: number
  scenarioTimeoutSeconds: number
  rootDir: string
  diskBudgetMb: number
  commits: 'minimal' | 'none'
  /** When set, after each scenario remove oldest repos so only this many remain for inspection. */
  keepLastN?: number
  verbose: boolean
  dryRun: boolean
  epBin: string
}

export type HarnessArgs =
  | { mode: 'help' }
  | { mode: 'version' }
  | { mode: 'analyze'; reportPath: string }
  | HarnessArgsRun

function getFlagValue(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name)
  if (i === -1 || i === argv.length - 1) return undefined
  return argv[i + 1]
}

function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(name)
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

/**
 * Parse process.argv into HarnessArgs. Seed defaults to Date.now() if not provided.
 * Check --help / -h and --version first; when set, return that mode and caller must exit without running.
 */
export function parseArgs(argv: string[] = process.argv): HarnessArgs {
  if (hasFlag(argv, '--help') || hasFlag(argv, '-h')) return { mode: 'help' }
  if (hasFlag(argv, '--version')) return { mode: 'version' }
  const analyzePath = getFlagValue(argv, '--analyze')
  if (analyzePath !== undefined && analyzePath !== '') return { mode: 'analyze', reportPath: analyzePath }
  const seedRaw = getFlagValue(argv, '--seed')
  const seed = seedRaw !== undefined ? parseNumber(seedRaw, Date.now()) : Date.now()
  const onlyScenarioRaw = getFlagValue(argv, '--only-scenario')
  const onlyScenario =
    onlyScenarioRaw !== undefined && onlyScenarioRaw !== ''
      ? parseNumber(onlyScenarioRaw, -1)
      : undefined
  return {
    mode: 'run',
    seed,
    scenarios: parseNumber(getFlagValue(argv, '--scenarios'), 10),
    onlyScenario: onlyScenario !== undefined && onlyScenario >= 0 ? onlyScenario : undefined,
    budgetMinutes: parseNumber(getFlagValue(argv, '--budget-minutes'), 14),
    scenarioTimeoutSeconds: parseNumber(getFlagValue(argv, '--scenario-timeout-seconds'), 90),
    rootDir: getFlagValue(argv, '--root-dir') ?? defaultScaffoldRootDir(),
    diskBudgetMb: parseNumber(getFlagValue(argv, '--disk-budget-mb'), 1024),
    commits: getFlagValue(argv, '--commits') === 'none' ? 'none' : 'minimal',
    keepLastN: (() => {
      const raw = getFlagValue(argv, '--keep-last-n')
      if (raw === undefined) return undefined
      const n = parseNumber(raw, 5)
      return n > 0 ? n : undefined
    })(),
    verbose: hasFlag(argv, '--verbose'),
    dryRun: hasFlag(argv, '--dry-run'),
    epBin: getFlagValue(argv, '--ep-bin') ?? 'ep',
  }
}
