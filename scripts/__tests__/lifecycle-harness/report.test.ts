/**
 * Unit tests for lifecycle harness report: classifyOutcome, truncateStderr.
 */

import { describe, expect, it } from 'vitest'
import { classifyOutcome, truncateStderr } from '../../lifecycle-harness/src/report.js'

describe('truncateStderr', () => {
  it('returns input when within limit', () => {
    const s = 'a'.repeat(100)
    expect(truncateStderr(s)).toBe(s)
  })

  it('truncates and appends when over limit', () => {
    const s = 'a'.repeat(2500)
    const out = truncateStderr(s)
    expect(out.length).toBeLessThan(s.length)
    expect(out.endsWith('...[truncated]')).toBe(true)
    expect(out.slice(0, 2000)).toBe(s.slice(0, 2000))
  })
})

describe('classifyOutcome', () => {
  it('success when exit 0 and not expectFailure', () => {
    expect(classifyOutcome(0, false, '', {})).toBe('success')
  })

  it('hard-fail when timed out', () => {
    expect(classifyOutcome(0, true, '', {})).toBe('hard-fail')
    expect(classifyOutcome(1, true, '', {})).toBe('hard-fail')
  })

  it('soft-fail when non-zero and stderr has known external pattern (401)', () => {
    expect(classifyOutcome(1, false, 'Error: 401 Unauthorized', {})).toBe('soft-fail')
  })

  it('soft-fail when non-zero and stderr has 404', () => {
    expect(classifyOutcome(1, false, '404 Not Found', {})).toBe('soft-fail')
  })

  it('soft-fail when non-zero and stderr has ENOTFOUND', () => {
    expect(classifyOutcome(1, false, 'getaddrinfo ENOTFOUND api.example.com', {})).toBe('soft-fail')
  })

  it('soft-fail when non-zero and stderr has not found pattern', () => {
    expect(classifyOutcome(1, false, 'no such pattern', {})).toBe('soft-fail')
  })

  it('hard-fail when non-zero and stderr has no known pattern', () => {
    expect(classifyOutcome(1, false, 'SyntaxError: unexpected token', {})).toBe('hard-fail')
  })

  it('expectedToFail: non-zero -> success', () => {
    expect(classifyOutcome(1, false, '', { expectFailure: true })).toBe('success')
    expect(classifyOutcome(1, false, 'any stderr', { expectFailure: true })).toBe('success')
  })

  it('expectedToFail: exit 0 -> soft-fail', () => {
    expect(classifyOutcome(0, false, '', { expectFailure: true })).toBe('soft-fail')
  })
})
