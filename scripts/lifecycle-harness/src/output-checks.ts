/**
 * Stdout validation for ep CLI commands.
 * Each checker returns { passed, reason? }; the harness reclassifies
 * a successful command as hard-fail when an output check fails.
 */

export interface OutputCheckResult {
  passed: boolean
  reason?: string
}

const PASS: OutputCheckResult = { passed: true }

/** ep list: should contain at least one pattern id (legacy slug or bullet title with parenthesized id). */
export function checkListOutput(stdout: string): OutputCheckResult {
  const hasLegacySlug = /^\s{2,}[a-z][a-z0-9-]+/m.test(stdout)
  const hasBulletedPatternId = /^\s*•\s+.*\(([a-z][a-z0-9-]+)\)\s*$/m.test(stdout)
  if (!hasLegacySlug && !hasBulletedPatternId) {
    return { passed: false, reason: 'ep list produced no recognizable pattern IDs' }
  }
  if (stdout.trim().split('\n').length < 5) {
    return { passed: false, reason: 'ep list output suspiciously short (< 5 lines)' }
  }
  return PASS
}

/** ep search: should return non-trivial output containing results. */
export function checkSearchOutput(stdout: string): OutputCheckResult {
  const trimmed = stdout.trim()
  if (trimmed.length < 20) {
    return { passed: false, reason: `ep search output too short (${trimmed.length} chars)` }
  }
  return PASS
}

/** ep show (valid ID): should return substantial content with the pattern. */
export function checkShowOutput(stdout: string, patternId: string): OutputCheckResult {
  const trimmed = stdout.trim()
  if (trimmed.length < 50) {
    return { passed: false, reason: `ep show ${patternId} output too short (${trimmed.length} chars)` }
  }
  return PASS
}

/** ep install list: should list at least one available tool. */
export function checkInstallListOutput(stdout: string): OutputCheckResult {
  const trimmed = stdout.trim()
  if (trimmed.length < 10) {
    return { passed: false, reason: `ep install list output too short (${trimmed.length} chars)` }
  }
  const hasToolRef = /cursor|vscode|windsurf|agents/i.test(trimmed)
  if (!hasToolRef) {
    return { passed: false, reason: 'ep install list output mentions no known tools' }
  }
  return PASS
}

/** ep skills validate (after fix): should not report missing sections. */
export function checkSkillsValidateClean(stdout: string, stderr: string): OutputCheckResult {
  const combined = `${stdout}\n${stderr}`
  if (/Missing required section/i.test(combined)) {
    return { passed: false, reason: 'ep skills validate still reports missing sections after fix' }
  }
  return PASS
}
