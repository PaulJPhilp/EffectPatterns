/**
 * Unit tests for lifecycle harness output-checks: stdout validation for ep CLI commands.
 */

import { describe, expect, it } from 'vitest'
import {
  checkInstallListOutput,
  checkListOutput,
  checkSearchOutput,
  checkShowOutput,
  checkSkillsValidateClean,
} from '../../lifecycle-harness/src/output-checks.js'

describe('checkListOutput', () => {
  it('passes when output has slug lines', () => {
    const stdout = `Effect Patterns (42 patterns)\n\n  retry-with-backoff\n  scoped-service-layer\n  tagged-errors\n  resource-management\n  stream-processing\n`
    expect(checkListOutput(stdout).passed).toBe(true)
  })

  it('passes when output has bulleted titles with parenthesized IDs', () => {
    const stdout = `Total Patterns: 2

  • Create a Service Layer from a Managed Resource (scoped-service-layer)
  • Combining Values with zip (combinator-zip)
  • Hello World: Your First Effect (getting-started-hello-world)
`
    expect(checkListOutput(stdout).passed).toBe(true)
  })

  it('fails when output is empty', () => {
    const result = checkListOutput('')
    expect(result.passed).toBe(false)
    expect(result.reason).toContain('no recognizable pattern')
  })

  it('fails when output has no slug lines', () => {
    const result = checkListOutput('Some header\nNo patterns here\n')
    expect(result.passed).toBe(false)
  })

  it('fails when output is too short', () => {
    const result = checkListOutput('  foo\n')
    expect(result.passed).toBe(false)
    expect(result.reason).toContain('short')
  })
})

describe('checkSearchOutput', () => {
  it('passes for non-trivial output', () => {
    const stdout = 'Found 3 patterns matching "retry":\n  retry-with-backoff\n  retry-schedule\n  retry-policy\n'
    expect(checkSearchOutput(stdout).passed).toBe(true)
  })

  it('fails for empty or very short output', () => {
    expect(checkSearchOutput('').passed).toBe(false)
    expect(checkSearchOutput('short').passed).toBe(false)
  })
})

describe('checkShowOutput', () => {
  it('passes for substantial output', () => {
    const stdout = '# retry-with-backoff\n\nRetry failed effects with exponential backoff.\n\n```ts\nimport { Effect, Schedule } from "effect"\n```\n'
    expect(checkShowOutput(stdout, 'retry-with-backoff').passed).toBe(true)
  })

  it('fails for very short output', () => {
    const result = checkShowOutput('Not found', 'retry-with-backoff')
    expect(result.passed).toBe(false)
    expect(result.reason).toContain('too short')
  })
})

describe('checkInstallListOutput', () => {
  it('passes when output mentions a known tool', () => {
    const stdout = 'Available tools:\n  cursor\n  vscode\n  windsurf\n  agents\n'
    expect(checkInstallListOutput(stdout).passed).toBe(true)
  })

  it('fails when output is empty', () => {
    expect(checkInstallListOutput('').passed).toBe(false)
  })

  it('fails when output mentions no known tools', () => {
    const result = checkInstallListOutput('some unrelated text that is long enough')
    expect(result.passed).toBe(false)
    expect(result.reason).toContain('no known tools')
  })
})

describe('checkSkillsValidateClean', () => {
  it('passes when no missing sections reported', () => {
    expect(checkSkillsValidateClean('All skills valid', '').passed).toBe(true)
  })

  it('fails when missing sections are in stdout', () => {
    const result = checkSkillsValidateClean('Missing required section: Rationale', '')
    expect(result.passed).toBe(false)
    expect(result.reason).toContain('missing sections')
  })

  it('fails when missing sections are in stderr', () => {
    const result = checkSkillsValidateClean('', 'Missing required section: Rationale')
    expect(result.passed).toBe(false)
  })
})
