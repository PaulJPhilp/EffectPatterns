/**
 * Run report types and JSON serialization.
 *
 * Outcome policy (explicit, consistent):
 * - success: exit code 0
 * - soft-fail: non-zero exit matching known external/expected conditions
 *   (API: 401, 403, 404, 429, 5xx; DNS; timeout; not-found / bogus show id)
 * - hard-fail: timeout (process killed), crash, or any other unexpected non-zero
 */

export type CommandOutcome = 'success' | 'soft-fail' | 'hard-fail'

export interface CommandRecord {
  /** Resolved binary (e.g. "ep" or path from --ep-bin). */
  resolvedBinary: string
  args: string[]
  cwd: string
  /** Environment overrides applied (only those set by harness). */
  envOverrides: Record<string, string>
  /** Timeout in ms used for this command, if any. */
  timeoutMs?: number
  exitCode: number
  durationMs: number
  outcome: CommandOutcome
  /** True when this command was an intentional negative test (e.g. bogus ep show). */
  expectedToFail?: boolean
  stderrExcerpt?: string
}

export interface ScenarioRecord {
  repoPath: string
  template: string
  tools: string[]
  scenarioIndex: number
  status: 'success' | 'soft-fail' | 'hard-fail'
  commands: CommandRecord[]
  /** True if ep show used fallback ID because parsing ep list output failed. */
  showIdParseFailed?: boolean
}

/** Per-run coverage: attempted = invoked at least once; succeeded = at least one success. */
export interface CoverageChecklist {
  list: boolean
  search: boolean
  show: boolean
  installList: boolean
  installAdd: boolean
  skillsList: boolean
  skillsPreview: boolean
  skillsValidate: boolean
  skillsStats: boolean
  completions: boolean
}

export interface RunReport {
  seed: number
  startTime: string
  endTime: string
  runtimeMs: number
  scenarios: ScenarioRecord[]
  totalCommandsAttempted: number
  totalSuccess: number
  totalSoftFail: number
  totalHardFail: number
  diskUsageBytes: number
  diskUsageMb: number
  firstFailingScenario: { scenarioIndex: number; seed: number } | null
  coverageAttempted: CoverageChecklist
  coverageSucceeded: CoverageChecklist
}

const STDERR_TRUNCATE = 2000

export function truncateStderr(stderr: string): string {
  if (stderr.length <= STDERR_TRUNCATE) return stderr
  return `${stderr.slice(0, STDERR_TRUNCATE)}\n...[truncated]`
}

/** Known external/expected failure indicators in stderr. Timeout: explicit patterns only to avoid over-matching. */
const SOFT_FAIL_PATTERNS = [
  /401|Unauthorized/i,
  /403|Forbidden/i,
  /404|Not Found|not found/i,
  /429|Too Many Requests/i,
  /5\d{2}/,
  /ENOTFOUND|getaddrinfo|ECONNREFUSED|ETIMEDOUT|network|unreachable/i,
  /ETIMEDOUT/i,
  /timed out/i,
  /TimeoutError/i,
  /request timeout/i,
  /not found|no such pattern|unknown pattern/i,
]

function isKnownExternalFailure(stderr: string): boolean {
  const s = stderr.slice(0, 4000)
  return SOFT_FAIL_PATTERNS.some((re) => re.test(s))
}

/**
 * Classify outcome using explicit policy:
 * - expectedToFail dominates: if expectFailure, non-zero (or timed out) -> success; zero -> soft-fail
 * - success: exit 0
 * - soft-fail: non-zero but known external (API 401/403/404/429/5xx, DNS, timeout, not-found)
 * - hard-fail: timeout (killed) or unexpected non-zero
 */
export function classifyOutcome(
  exitCode: number,
  timedOut: boolean,
  stderr: string,
  options: { expectFailure?: boolean }
): CommandOutcome {
  if (options.expectFailure) {
    if (exitCode === 0) return 'soft-fail'
    return 'success'
  }
  if (timedOut) return 'hard-fail'
  if (exitCode === 0) return 'success'
  if (isKnownExternalFailure(stderr)) return 'soft-fail'
  return 'hard-fail'
}
