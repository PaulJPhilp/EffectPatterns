/**
 * Unit tests for parseFirstPatternIdFromList (ep list output parsing).
 */

import { describe, expect, it } from 'vitest'
import { parseFirstPatternIdFromList } from '../../lifecycle-harness/src/list-parse.js'

describe('parseFirstPatternIdFromList', () => {
  it('returns id from "Next: ep show <id>" line', () => {
    const stdout = 'Some header\nNext: ep show retry-with-backoff\nMore text'
    expect(parseFirstPatternIdFromList(stdout)).toBe('retry-with-backoff')
  })

  it('returns id from slug line (indented 2+ spaces)', () => {
    const stdout = '  retry-with-backoff\n  other-pattern'
    expect(parseFirstPatternIdFromList(stdout)).toBe('retry-with-backoff')
  })

  it('prefers Next: ep show over slug line', () => {
    const stdout = '  first-slug\nNext: ep show preferred-id'
    expect(parseFirstPatternIdFromList(stdout)).toBe('preferred-id')
  })

  it('returns null for empty string', () => {
    expect(parseFirstPatternIdFromList('')).toBe(null)
  })

  it('returns null when no match', () => {
    expect(parseFirstPatternIdFromList('No pattern here\nJust text')).toBe(null)
  })
})
