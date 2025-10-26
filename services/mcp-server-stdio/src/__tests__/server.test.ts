import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildSnippet,
  getPatternById,
  type Pattern,
  searchPatterns,
} from '@effect-patterns/toolkit';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('MCP Server Integration', () => {
  let patterns: Pattern[];

  it('should load patterns from JSON file', () => {
    const patternsPath = join(
      __dirname,
      '../../../../data/patterns-index.json',
    );
    const data = readFileSync(patternsPath, 'utf-8');
    const parsed = JSON.parse(data);
    patterns = parsed.patterns || [];

    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns[0]).toHaveProperty('id');
    expect(patterns[0]).toHaveProperty('title');
  });

  it('should search patterns successfully', () => {
    const patternsPath = join(
      __dirname,
      '../../../../data/patterns-index.json',
    );
    const data = readFileSync(patternsPath, 'utf-8');
    const parsed = JSON.parse(data);
    patterns = parsed.patterns || [];

    const results = searchPatterns({
      patterns,
      query: 'effect',
      limit: 5,
    });

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
  });

  it('should get pattern by ID', () => {
    const patternsPath = join(
      __dirname,
      '../../../../data/patterns-index.json',
    );
    const data = readFileSync(patternsPath, 'utf-8');
    const parsed = JSON.parse(data);
    patterns = parsed.patterns || [];

    if (patterns.length > 0) {
      const firstPattern = patterns[0];
      const result = getPatternById(patterns, firstPattern.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(firstPattern.id);
    }
  });

  it('should generate code snippet', () => {
    const patternsPath = join(
      __dirname,
      '../../../../data/patterns-index.json',
    );
    const data = readFileSync(patternsPath, 'utf-8');
    const parsed = JSON.parse(data);
    patterns = parsed.patterns || [];

    if (patterns.length > 0) {
      const snippet = buildSnippet({
        pattern: patterns[0],
        customName: 'testExample',
        moduleType: 'esm',
      });

      expect(snippet).toBeDefined();
      expect(typeof snippet).toBe('string');
      expect(snippet.length).toBeGreaterThan(0);
      expect(snippet).toContain('import');
    }
  });

  it('should handle missing pattern gracefully', () => {
    const patternsPath = join(
      __dirname,
      '../../../../data/patterns-index.json',
    );
    const data = readFileSync(patternsPath, 'utf-8');
    const parsed = JSON.parse(data);
    patterns = parsed.patterns || [];

    const result = getPatternById(patterns, 'non-existent-pattern');
    expect(result).toBeUndefined();
  });
});
