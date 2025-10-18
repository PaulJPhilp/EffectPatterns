import { describe, expect, it } from 'vitest';
import { splitSections } from '../src/splitSections';

describe('splitSections', () => {
  it('splits basic content with two headings', () => {
    const content = '# Title\n## One\nline1\nline2\n## Two\nmore';
    const sections = splitSections(content);
    expect(sections).toEqual(['# Title', 'One\nline1\nline2', 'Two\nmore']);
  });

  it('trims sections and removes empty ones', () => {
    const content = '  # Title  \n##  One  \n\n##   \n## Two\n';
    const sections = splitSections(content);
    expect(sections).toEqual(['# Title', 'One', 'Two']);
  });

  it('returns empty array for empty or non-string input', () => {
    expect(splitSections('')).toEqual([]);
    // @ts-expect-error test non-string
    expect(splitSections(null)).toEqual([]);
  });
});
