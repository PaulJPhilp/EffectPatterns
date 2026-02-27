/**
 * Unit tests for parseFirstPatternIdFromList (ep list output parsing).
 */

import { describe, expect, it } from 'vitest'
import {
  parseFirstPatternIdFromList,
  parsePatternIdsFromList,
} from '../../lifecycle-harness/src/list-parse.js'

describe('parseFirstPatternIdFromList', () => {
  it('returns id from "Next: ep show <id>" line', () => {
    const stdout = 'Some header\nNext: ep show retry-with-backoff\nMore text'
    expect(parseFirstPatternIdFromList(stdout)).toBe('retry-with-backoff')
  })

  it('returns id from slug line (indented 2+ spaces)', () => {
    const stdout = '  retry-with-backoff\n  other-pattern'
    expect(parseFirstPatternIdFromList(stdout)).toBe('retry-with-backoff')
  })

  it('returns id from bulleted title line with parenthesized id', () => {
    const stdout = '  • Hello World: Your First Effect (getting-started-hello-world)\n'
    expect(parseFirstPatternIdFromList(stdout)).toBe('getting-started-hello-world')
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

describe('parsePatternIdsFromList', () => {
  it('returns up to max IDs from slug lines', () => {
    const stdout = '  a-one\n  b-two\n  c-three\n  d-four'
    expect(parsePatternIdsFromList(stdout, 2)).toEqual(['a-one', 'b-two'])
    expect(parsePatternIdsFromList(stdout, 3)).toEqual(['a-one', 'b-two', 'c-three'])
    expect(parsePatternIdsFromList(stdout, 10)).toEqual(['a-one', 'b-two', 'c-three', 'd-four'])
  })

  it('returns up to max IDs from bulleted title lines', () => {
    const stdout = [
      '  • One (a-one)',
      '  • Two (b-two)',
      '  • Three (c-three)',
      '  • Four (d-four)',
    ].join('\n')
    expect(parsePatternIdsFromList(stdout, 2)).toEqual(['a-one', 'b-two'])
    expect(parsePatternIdsFromList(stdout, 3)).toEqual(['a-one', 'b-two', 'c-three'])
    expect(parsePatternIdsFromList(stdout, 10)).toEqual(['a-one', 'b-two', 'c-three', 'd-four'])
  })

  it('prefers Next: ep show id first', () => {
    const stdout = '  first\n  second\nNext: ep show preferred\n  third'
    expect(parsePatternIdsFromList(stdout, 3)).toEqual(['preferred', 'first', 'second'])
  })

  it('dedupes IDs', () => {
    const stdout = '  same\n  same\n  other'
    expect(parsePatternIdsFromList(stdout, 3)).toEqual(['same', 'other'])
  })

  it('returns empty when no match', () => {
    expect(parsePatternIdsFromList('No slugs', 3)).toEqual([])
  })
})
