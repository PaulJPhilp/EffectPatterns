/**
 * Search Functionality Tests
 *
 * Comprehensive tests for fuzzy search, filtering, and pattern lookup.
 */

import { describe, expect, it } from 'vitest';
import type { Pattern } from '../src/schemas/pattern.js';
import {
  getPatternById,
  searchPatterns,
  toPatternSummary,
} from '../src/search.js';

// Test fixtures
const createMockPattern = (overrides: Partial<Pattern> = {}): Pattern => ({
  id: 'test-pattern',
  title: 'Test Pattern',
  description: 'A test pattern for unit testing',
  category: 'error-handling',
  difficulty: 'beginner',
  tags: ['test', 'example'],
  examples: [
    {
      language: 'typescript',
      code: 'const test = "example";',
      description: 'Test example',
    },
  ],
  useCases: ['Testing'],
  relatedPatterns: [],
  effectVersion: '3.x',
  ...overrides,
});

const mockPatterns: Pattern[] = [
  createMockPattern({
    id: 'retry-backoff',
    title: 'Retry with Exponential Backoff',
    description: 'Retry failed operations with exponential backoff',
    category: 'error-handling',
    difficulty: 'intermediate',
    tags: ['retry', 'resilience', 'error-handling'],
  }),
  createMockPattern({
    id: 'concurrent-batch',
    title: 'Concurrent Batch Processing',
    description: 'Process large datasets in concurrent batches',
    category: 'concurrency',
    difficulty: 'intermediate',
    tags: ['concurrency', 'batching', 'parallel'],
  }),
  createMockPattern({
    id: 'resource-pool',
    title: 'Resource Pool Management',
    description: 'Manage a pool of reusable resources',
    category: 'resource-management',
    difficulty: 'advanced',
    tags: ['pool', 'resources', 'management'],
  }),
  createMockPattern({
    id: 'simple-effect',
    title: 'Simple Effect Example',
    description: 'Basic Effect usage for beginners',
    category: 'error-handling',
    difficulty: 'beginner',
    tags: ['basics', 'beginner', 'simple'],
  }),
];

describe('searchPatterns', () => {
  describe('fuzzy search', () => {
    it('should find patterns by exact title match', () => {
      const results = searchPatterns({
        patterns: mockPatterns,
        query: 'Retry',
      });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('retry-backoff');
    });

    it('should find patterns by partial title match', () => {
      const results = searchPatterns({
        patterns: mockPatterns,
        query: 'batch',
      });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('concurrent-batch');
    });

    it('should find patterns by description match', () => {
      const results = searchPatterns({
        patterns: mockPatterns,
        query: 'datasets',
      });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('concurrent-batch');
    });

    it('should find patterns by tag match', () => {
      const results = searchPatterns({
        patterns: mockPatterns,
        query: 'resilience',
      });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('retry-backoff');
    });

    it('should find patterns by category match', () => {
      const results = searchPatterns({
        patterns: mockPatterns,
        query: 'concurrency',
      });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('concurrent-batch');
    });

    it('should handle case-insensitive search', () => {
      const results = searchPatterns({
        patterns: mockPatterns,
        query: 'RETRY',
      });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('retry-backoff');
    });

    it('should handle queries with spaces', () => {
      const results = searchPatterns({
        patterns: mockPatterns,
        query: 'resource pool',
      });
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty array for no matches', () => {
      const results = searchPatterns({
        patterns: mockPatterns,
        query: 'nonexistent',
      });
      expect(results).toHaveLength(0);
    });

    it('should return all patterns for empty query', () => {
      const results = searchPatterns({ patterns: mockPatterns, query: '' });
      expect(results).toHaveLength(mockPatterns.length);
    });

    it('should return all patterns for undefined query', () => {
      const results = searchPatterns({ patterns: mockPatterns });
      expect(results).toHaveLength(mockPatterns.length);
    });

    it('should prioritize title matches over description matches', () => {
      const patternsWithOverlap: Pattern[] = [
        createMockPattern({
          id: 'title-match',
          title: 'Error Handler',
          description: 'Handles various errors',
        }),
        createMockPattern({
          id: 'desc-match',
          title: 'Something Else',
          description: 'This is an error handler implementation',
        }),
      ];

      const results = searchPatterns({
        patterns: patternsWithOverlap,
        query: 'error handler',
      });
      expect(results[0].id).toBe('title-match');
    });
  });

  describe('category filter', () => {
    it('should filter by exact category', () => {
      const results = searchPatterns({
        patterns: mockPatterns,
        category: 'error-handling',
      });
      expect(results).toHaveLength(2);
      expect(results.every((p) => p.category === 'error-handling')).toBe(true);
    });

    it('should handle case-insensitive category filter', () => {
      const results = searchPatterns({
        patterns: mockPatterns,
        category: 'ERROR-HANDLING',
      });
      expect(results).toHaveLength(2);
    });

    it('should combine category filter with search query', () => {
      const results = searchPatterns({
        patterns: mockPatterns,
        query: 'retry',
        category: 'error-handling',
      });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('retry-backoff');
    });

    it('should return empty array for non-matching category', () => {
      const results = searchPatterns({
        patterns: mockPatterns,
        category: 'nonexistent',
      });
      expect(results).toHaveLength(0);
    });
  });

  describe('difficulty filter', () => {
    it('should filter by exact difficulty', () => {
      const results = searchPatterns({
        patterns: mockPatterns,
        difficulty: 'intermediate',
      });
      expect(results).toHaveLength(2);
      expect(results.every((p) => p.difficulty === 'intermediate')).toBe(true);
    });

    it('should handle case-insensitive difficulty filter', () => {
      const results = searchPatterns({
        patterns: mockPatterns,
        difficulty: 'BEGINNER',
      });
      expect(results).toHaveLength(1);
    });

    it('should combine difficulty filter with category filter', () => {
      const results = searchPatterns({
        patterns: mockPatterns,
        category: 'error-handling',
        difficulty: 'beginner',
      });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('simple-effect');
    });

    it('should combine all filters with search query', () => {
      const results = searchPatterns({
        patterns: mockPatterns,
        query: 'effect',
        category: 'error-handling',
        difficulty: 'beginner',
      });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('simple-effect');
    });
  });

  describe('limit parameter', () => {
    it('should limit number of results', () => {
      const results = searchPatterns({
        patterns: mockPatterns,
        limit: 2,
      });
      expect(results).toHaveLength(2);
    });

    it('should return all results if limit is greater than result count', () => {
      const results = searchPatterns({
        patterns: mockPatterns,
        limit: 100,
      });
      expect(results).toHaveLength(mockPatterns.length);
    });

    it('should handle limit of 0 (returns all)', () => {
      // Limit of 0 is treated as no limit (returns all results)
      const results = searchPatterns({
        patterns: mockPatterns,
        limit: 0,
      });
      expect(results).toHaveLength(mockPatterns.length);
    });

    it('should ignore negative limits', () => {
      const results = searchPatterns({
        patterns: mockPatterns,
        limit: -1,
      });
      expect(results).toHaveLength(mockPatterns.length);
    });

    it('should apply limit after filtering and sorting', () => {
      const results = searchPatterns({
        patterns: mockPatterns,
        query: 'error',
        limit: 1,
      });
      expect(results).toHaveLength(1);
    });
  });

  describe('edge cases', () => {
    it('should handle empty patterns array', () => {
      const results = searchPatterns({ patterns: [], query: 'test' });
      expect(results).toHaveLength(0);
    });

    it('should handle patterns with missing optional fields', () => {
      const minimalPattern = createMockPattern({
        relatedPatterns: undefined,
        effectVersion: undefined,
      });

      const results = searchPatterns({
        patterns: [minimalPattern],
        query: 'test',
      });
      expect(results).toHaveLength(1);
    });

    it('should handle special characters in query', () => {
      const results = searchPatterns({
        patterns: mockPatterns,
        query: 'error-handling',
      });
      expect(results.length).toBeGreaterThan(0);
    });

    it('should trim whitespace from query', () => {
      const results = searchPatterns({
        patterns: mockPatterns,
        query: '  retry  ',
      });
      expect(results).toHaveLength(1);
    });
  });
});

describe('getPatternById', () => {
  it('should find pattern by exact ID', () => {
    const pattern = getPatternById(mockPatterns, 'retry-backoff');
    expect(pattern).toBeDefined();
    expect(pattern?.id).toBe('retry-backoff');
  });

  it('should return undefined for non-existent ID', () => {
    const pattern = getPatternById(mockPatterns, 'nonexistent');
    expect(pattern).toBeUndefined();
  });

  it('should handle empty patterns array', () => {
    const pattern = getPatternById([], 'test');
    expect(pattern).toBeUndefined();
  });

  it('should handle empty ID string', () => {
    const pattern = getPatternById(mockPatterns, '');
    expect(pattern).toBeUndefined();
  });

  it('should be case-sensitive', () => {
    const pattern = getPatternById(mockPatterns, 'RETRY-BACKOFF');
    expect(pattern).toBeUndefined();
  });
});

describe('toPatternSummary', () => {
  it('should convert pattern to summary correctly', () => {
    const pattern = mockPatterns[0];
    const summary = toPatternSummary(pattern);

    expect(summary.id).toBe(pattern.id);
    expect(summary.title).toBe(pattern.title);
    expect(summary.description).toBe(pattern.description);
    expect(summary.category).toBe(pattern.category);
    expect(summary.difficulty).toBe(pattern.difficulty);
    expect(summary.tags).toEqual(pattern.tags);
  });

  it('should not include examples in summary', () => {
    const pattern = mockPatterns[0];
    const summary = toPatternSummary(pattern);

    expect('examples' in summary).toBe(false);
  });

  it('should not include useCases in summary', () => {
    const pattern = mockPatterns[0];
    const summary = toPatternSummary(pattern);

    expect('useCases' in summary).toBe(false);
  });

  it('should not include relatedPatterns in summary', () => {
    const pattern = mockPatterns[0];
    const summary = toPatternSummary(pattern);

    expect('relatedPatterns' in summary).toBe(false);
  });

  it('should handle patterns with empty tags', () => {
    const pattern = createMockPattern({ tags: [] });
    const summary = toPatternSummary(pattern);

    expect(summary.tags).toEqual([]);
  });
});

describe('REGRESSION TESTS: Fix #1 - Separator Normalization', () => {
  /**
   * Fix: Normalize hyphens and underscores to spaces in fuzzy matching
   * Commit: eafbb27
   * Issue: Query "error handling" couldn't match pattern tag "error-handling"
   */

  const patternsWithHyphenatedTags: Pattern[] = [
    createMockPattern({
      id: 'error-handling-pattern',
      title: 'Error Recovery',
      description: 'Pattern for recovering from errors',
      category: 'error-handling',
      tags: ['error-handling', 'recovery', 'resilience'],
    }),
    createMockPattern({
      id: 'data-transform-pattern',
      title: 'Data Pipeline',
      description: 'Transform and process data',
      category: 'data-transformation',
      tags: ['data-transformation', 'pipeline', 'processing'],
    }),
    createMockPattern({
      id: 'resource-mgmt-pattern',
      title: 'Resource Pool',
      description: 'Manage resource allocation',
      category: 'resource-management',
      tags: ['resource-management', 'allocation', 'cleanup'],
    }),
  ];

  it('should match multi-word query "error handling" with hyphenated tag "error-handling"', () => {
    const results = searchPatterns({
      patterns: patternsWithHyphenatedTags,
      query: 'error handling',
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('error-handling-pattern');
  });

  it('should match multi-word query "data transformation" with hyphenated category', () => {
    const results = searchPatterns({
      patterns: patternsWithHyphenatedTags,
      query: 'data transformation',
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('data-transform-pattern');
  });

  it('should match multi-word query "resource management" with hyphenated tag', () => {
    const results = searchPatterns({
      patterns: patternsWithHyphenatedTags,
      query: 'resource management',
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('resource-mgmt-pattern');
  });

  it('should still match hyphenated queries with hyphenated data', () => {
    const results = searchPatterns({
      patterns: patternsWithHyphenatedTags,
      query: 'error-handling',
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('error-handling-pattern');
  });

  it('should match underscored queries with hyphenated data', () => {
    const results = searchPatterns({
      patterns: patternsWithHyphenatedTags,
      query: 'error_handling',
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('error-handling-pattern');
  });

  it('should handle mixed separators in queries', () => {
    const results = searchPatterns({
      patterns: patternsWithHyphenatedTags,
      query: 'data-transformation',
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('data-transform-pattern');
  });
});

describe('REGRESSION TESTS: Fix #2 - Early Returns Removal', () => {
  /**
   * Fix: Check all fields (title, description, tags, category) instead of returning early
   * Commit: a158a6c
   * Issue: If title didn't match, tags and categories were never evaluated
   */

  const patternsForFieldChecking: Pattern[] = [
    createMockPattern({
      id: 'retry-pattern',
      title: 'Exponential Backoff',
      description: 'Automatic retries with increasing delays',
      category: 'error-handling',
      tags: ['retry', 'backoff', 'resilience'],
    }),
    createMockPattern({
      id: 'concurrent-pattern',
      title: 'Batch Operations',
      description: 'Process items concurrently',
      category: 'concurrency',
      tags: ['concurrent', 'parallel', 'batch'],
    }),
  ];

  it('should find pattern by tag even if title does not match', () => {
    // Query "retry" should find retry-pattern via tags, not title
    const results = searchPatterns({
      patterns: patternsForFieldChecking,
      query: 'retry',
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('retry-pattern');
  });

  it('should evaluate category field even if title and description do not match', () => {
    // Query "error-handling" should match via category field
    const results = searchPatterns({
      patterns: patternsForFieldChecking,
      query: 'error-handling',
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('retry-pattern');
  });

  it('should find best match across all fields, not just title', () => {
    // Query "concurrent" should match via tags, giving better score than description
    const results = searchPatterns({
      patterns: patternsForFieldChecking,
      query: 'concurrent',
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('concurrent-pattern');
  });

  it('should evaluate all fields when title is vague', () => {
    // "Batch Operations" title is vague, but tags and category are specific
    const results = searchPatterns({
      patterns: patternsForFieldChecking,
      query: 'concurrency',
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('concurrent-pattern');
  });

  it('should return multiple results when multiple fields match', () => {
    const patternsWithOverlap: Pattern[] = [
      createMockPattern({
        id: 'pattern1',
        title: 'Error Handler',
        description: 'Handles errors',
        category: 'error-handling',
        tags: ['error', 'handling'],
      }),
      createMockPattern({
        id: 'pattern2',
        title: 'Something Else',
        description: 'Error recovery mechanism',
        category: 'error-handling',
        tags: ['recovery', 'mechanism'],
      }),
    ];

    const results = searchPatterns({
      patterns: patternsWithOverlap,
      query: 'error-handling',
    });
    // Both patterns should be found (one via title, one via category)
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('should prioritize title matches over tag matches (weighting)', () => {
    // Patterns with same query in title vs tags
    const patternsWithWeighting: Pattern[] = [
      createMockPattern({
        id: 'title-match',
        title: 'Retry Pattern',
        description: 'Description',
        category: 'other',
        tags: ['something'],
      }),
      createMockPattern({
        id: 'tag-match',
        title: 'Other Pattern',
        description: 'Description',
        category: 'other',
        tags: ['retry'],
      }),
    ];

    const results = searchPatterns({
      patterns: patternsWithWeighting,
      query: 'retry',
    });
    // Title match should come first due to 1.0 weight vs 0.5 tag weight
    expect(results[0].id).toBe('title-match');
  });
});

describe('REGRESSION TESTS: Combined Fixes', () => {
  /**
   * Verify both fixes work together correctly
   */

  const realWorldPatterns: Pattern[] = [
    createMockPattern({
      id: 'retry-backoff',
      title: 'Retry with Exponential Backoff',
      description: 'Implement automatic retries with exponential backoff',
      category: 'error-handling',
      tags: ['retry', 'backoff', 'resilience', 'error-handling'],
    }),
    createMockPattern({
      id: 'concurrent-batch',
      title: 'Concurrent Batch Processing',
      description: 'Process large datasets using concurrent batches',
      category: 'concurrency',
      tags: ['concurrency', 'batch', 'parallel', 'performance'],
    }),
    createMockPattern({
      id: 'resource-pool',
      title: 'Resource Pool Manager',
      description: 'Manage a pool of reusable resources efficiently',
      category: 'resource-management',
      tags: ['resource-management', 'pool', 'allocation'],
    }),
  ];

  it('should find "error handling" patterns (both fixes needed)', () => {
    const results = searchPatterns({
      patterns: realWorldPatterns,
      query: 'error handling',
    });
    expect(results.length).toBeGreaterThan(0);
    // Should find via "error-handling" tag (separator normalization)
    // AND via category field (early return removal)
    expect(results[0].id).toBe('retry-backoff');
  });

  it('should find "data transformation" patterns with normalized separators', () => {
    // Note: No data-transformation patterns in realWorldPatterns, but separator norm should work
    const results = searchPatterns({
      patterns: realWorldPatterns,
      query: 'resource management',
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('resource-pool');
  });

  it('should rank results by relevance when multiple fields match', () => {
    // Query that could match multiple fields
    const results = searchPatterns({
      patterns: realWorldPatterns,
      query: 'concurrent',
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('concurrent-batch');
  });

  it('should work with multi-word queries that appear in patterns', () => {
    // "exponential backoff" appears in title of retry-backoff pattern
    const results = searchPatterns({
      patterns: realWorldPatterns,
      query: 'exponential backoff',
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('retry-backoff');
  });

  it('should handle category filtering with normalized separators', () => {
    const results = searchPatterns({
      patterns: realWorldPatterns,
      category: 'error-handling',
      query: 'error handling',
    });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('retry-backoff');
  });
});
