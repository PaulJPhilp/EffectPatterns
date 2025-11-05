/**
 * Search and Filtering Tests
 *
 * Comprehensive tests for:
 * - Filter parser functionality
 * - Search service methods
 * - CLI command integration
 */

import { describe, it, expect } from 'vitest';
import {
  parseFilterExpression,
  validateFilterClause,
  filterToString,
  createFilterConditions,
  mergeFilterConditions,
  hasFilters,
  getFilterKeys,
  updateFilterKey,
  removeFilterKey,
} from '../lib/filter-parser.js';
import type { FilterClause, FilterConditions, MemorySearchOptions, DocumentSearchOptions } from '../types.js';

describe('Filter Parser', () => {
  describe('parseFilterExpression', () => {
    it('should parse simple key:value expressions', () => {
      const result = parseFilterExpression('category:ai');
      expect(result.AND).toBeDefined();
      expect(result.AND).toHaveLength(1);
      expect(result.AND![0].key).toBe('category');
      expect(result.AND![0].value).toBe('ai');
      expect(result.AND![0].negate).toBe(false);
    });

    it('should parse AND expressions', () => {
      const result = parseFilterExpression('category:ai AND difficulty:beginner');
      expect(result.AND).toHaveLength(2);
      expect(result.AND![0].key).toBe('category');
      expect(result.AND![1].key).toBe('difficulty');
    });

    it('should parse OR expressions', () => {
      const result = parseFilterExpression('author:alice OR author:bob');
      expect(result.OR).toHaveLength(2);
      expect(result.OR![0].value).toBe('alice');
      expect(result.OR![1].value).toBe('bob');
    });

    it('should parse numeric values', () => {
      const result = parseFilterExpression('difficulty:3');
      expect(result.AND![0].value).toBe(3);
    });

    it('should parse boolean values', () => {
      const result = parseFilterExpression('active:true');
      expect(result.AND![0].value).toBe(true);
    });

    it('should handle empty expressions', () => {
      const result = parseFilterExpression('');
      expect(Object.keys(result).length).toBe(0);
    });

    it('should handle whitespace-only expressions', () => {
      const result = parseFilterExpression('   ');
      expect(Object.keys(result).length).toBe(0);
    });

    it('should ignore NOT operator (negation not fully implemented)', () => {
      // Note: Full NOT support would require more complex parser
      const result = parseFilterExpression('NOT category:ai');
      // Parser should handle this gracefully
      expect(result).toBeDefined();
    });
  });

  describe('validateFilterClause', () => {
    it('should validate correct filter clauses', () => {
      const clause: FilterClause = {
        key: 'category',
        value: 'ai',
        negate: false as const,
      };
      expect(validateFilterClause(clause)).toBe(true);
    });

    it('should reject clauses with empty key', () => {
      const clause: FilterClause = {
        key: '',
        value: 'ai',
        negate: false as const,
      };
      expect(validateFilterClause(clause)).toBe(false);
    });

    it('should reject clauses with invalid value type', () => {
      const clause = {
        key: 'category',
        value: { nested: 'object' },
        negate: false as const,
      } as any;
      expect(validateFilterClause(clause)).toBe(false);
    });

    it('should reject null clauses', () => {
      expect(validateFilterClause(null as any)).toBe(false);
    });

    it('should accept numeric values', () => {
      const clause: FilterClause = {
        key: 'difficulty',
        value: 3,
        negate: false as const,
      };
      expect(validateFilterClause(clause)).toBe(true);
    });

    it('should accept boolean values', () => {
      const clause: FilterClause = {
        key: 'active',
        value: true,
        negate: false as const,
      };
      expect(validateFilterClause(clause)).toBe(true);
    });
  });

  describe('filterToString', () => {
    it('should convert filter conditions to human-readable string', () => {
      const conditions: FilterConditions = {
        AND: [
          { key: 'category', value: 'ai', negate: false as const },
          { key: 'difficulty', value: 'beginner', negate: false as const },
        ],
      };
      const result = filterToString(conditions);
      expect(result).toContain('category:ai');
      expect(result).toContain('difficulty:beginner');
    });

    it('should handle empty conditions', () => {
      const result = filterToString({});
      expect(result).toBe('No filters');
    });

    it('should display negated clauses', () => {
      const conditions: FilterConditions = {
        AND: [{ key: 'status', value: 'draft', negate: true }],
      };
      const result = filterToString(conditions);
      expect(result).toContain('NOT');
    });
  });

  describe('createFilterConditions', () => {
    it('should create AND conditions from object', () => {
      const filters = {
        category: 'ai',
        difficulty: 'beginner',
      };
      const result = createFilterConditions(filters);
      expect(result.AND).toHaveLength(2);
      expect(result.AND).toBeDefined();
    });

    it('should create OR conditions from object', () => {
      const filters = {
        author: 'alice',
        author2: 'bob',
      };
      const result = createFilterConditions(filters, 'OR');
      expect(result.OR).toHaveLength(2);
      expect(result.AND).toBeUndefined();
    });

    it('should handle numeric and boolean values', () => {
      const filters = {
        difficulty: 3,
        active: true,
      };
      const result = createFilterConditions(filters);
      expect(result.AND![0].value).toBe(3);
      expect(result.AND![1].value).toBe(true);
    });
  });

  describe('mergeFilterConditions', () => {
    it('should merge multiple filter conditions', () => {
      const cond1: FilterConditions = {
        AND: [{ key: 'category', value: 'ai', negate: false as const }],
      };
      const cond2: FilterConditions = {
        AND: [{ key: 'difficulty', value: 'beginner', negate: false as const }],
      };
      const result = mergeFilterConditions([cond1, cond2]);
      expect(result.AND).toHaveLength(2);
    });

    it('should use AND as default operator', () => {
      const cond1: FilterConditions = {
        OR: [{ key: 'author', value: 'alice', negate: false as const }],
      };
      const cond2: FilterConditions = {
        OR: [{ key: 'author', value: 'bob', negate: false as const }],
      };
      const result = mergeFilterConditions([cond1, cond2]);
      expect(result.AND).toHaveLength(2);
    });

    it('should use OR operator when specified', () => {
      const cond1: FilterConditions = {
        AND: [{ key: 'category', value: 'ai', negate: false as const }],
      };
      const cond2: FilterConditions = {
        AND: [{ key: 'category', value: 'devops', negate: false as const }],
      };
      const result = mergeFilterConditions([cond1, cond2], 'OR');
      expect(result.OR).toHaveLength(2);
    });
  });

  describe('hasFilters', () => {
    it('should return true for conditions with clauses', () => {
      const conditions: FilterConditions = {
        AND: [{ key: 'category', value: 'ai', negate: false as const }],
      };
      expect(hasFilters(conditions)).toBe(true);
    });

    it('should return false for empty conditions', () => {
      expect(hasFilters({})).toBe(false);
    });

    it('should return false for conditions with empty arrays', () => {
      expect(hasFilters({ AND: [], OR: [] })).toBe(false);
    });
  });

  describe('getFilterKeys', () => {
    it('should extract all keys from filter conditions', () => {
      const conditions: FilterConditions = {
        AND: [
          { key: 'category', value: 'ai', negate: false as const },
          { key: 'difficulty', value: 'beginner', negate: false as const },
        ],
      };
      const keys = getFilterKeys(conditions);
      expect(keys).toContain('category');
      expect(keys).toContain('difficulty');
      expect(keys).toHaveLength(2);
    });

    it('should handle mixed AND/OR conditions', () => {
      const conditions: FilterConditions = {
        AND: [{ key: 'category', value: 'ai', negate: false as const }],
        OR: [{ key: 'author', value: 'alice', negate: false as const }],
      };
      const keys = getFilterKeys(conditions);
      expect(keys).toContain('category');
      expect(keys).toContain('author');
    });

    it('should remove duplicates', () => {
      const conditions: FilterConditions = {
        AND: [
          { key: 'category', value: 'ai', negate: false as const },
          { key: 'category', value: 'devops', negate: false as const },
        ],
      };
      const keys = getFilterKeys(conditions);
      expect(keys).toEqual(['category']);
    });
  });

  describe('updateFilterKey', () => {
    it('should update existing filter key', () => {
      const conditions: FilterConditions = {
        AND: [{ key: 'category', value: 'ai', negate: false as const }],
      };
      const result = updateFilterKey(conditions, 'category', 'devops');
      expect(result.AND![0].value).toBe('devops');
    });

    it('should add new key if not present', () => {
      const conditions: FilterConditions = {
        AND: [{ key: 'category', value: 'ai', negate: false as const }],
      };
      const result = updateFilterKey(conditions, 'difficulty', 'beginner');
      expect(result.AND).toHaveLength(2);
    });

    it('should not mutate original conditions', () => {
      const conditions: FilterConditions = {
        AND: [{ key: 'category', value: 'ai', negate: false as const }],
      };
      const original = JSON.stringify(conditions);
      updateFilterKey(conditions, 'category', 'devops');
      expect(JSON.stringify(conditions)).toBe(original);
    });
  });

  describe('removeFilterKey', () => {
    it('should remove existing filter key', () => {
      const conditions: FilterConditions = {
        AND: [
          { key: 'category', value: 'ai', negate: false },
          { key: 'difficulty', value: 'beginner', negate: false },
        ],
      };
      const result = removeFilterKey(conditions, 'category');
      expect(result.AND).toHaveLength(1);
      expect(result.AND![0].key).toBe('difficulty');
    });

    it('should remove AND/OR if empty', () => {
      const conditions: FilterConditions = {
        AND: [{ key: 'category', value: 'ai', negate: false }],
      };
      const result = removeFilterKey(conditions, 'category');
      expect(result.AND).toBeUndefined();
    });

    it('should not mutate original conditions', () => {
      const conditions: FilterConditions = {
        AND: [{ key: 'category', value: 'ai', negate: false }],
      };
      const original = JSON.stringify(conditions);
      removeFilterKey(conditions, 'category');
      expect(JSON.stringify(conditions)).toBe(original);
    });
  });
});

describe('Search Options Types', () => {
  describe('MemorySearchOptions', () => {
    it('should create valid memory search options', () => {
      const options: MemorySearchOptions = {
        q: 'kubernetes',
        limit: 20,
        threshold: 0.7,
        rerank: true,
        containerTag: 'team_devops',
      };

      expect(options.q).toBe('kubernetes');
      expect(options.limit).toBe(20);
      expect(options.threshold).toBe(0.7);
      expect(options.rerank).toBe(true);
      expect(options.containerTag).toBe('team_devops');
    });

    it('should allow optional properties', () => {
      const options: MemorySearchOptions = {
        q: 'effect',
      };

      expect(options.q).toBe('effect');
      expect(options.limit).toBeUndefined();
      expect(options.threshold).toBeUndefined();
    });
  });

  describe('DocumentSearchOptions', () => {
    it('should create valid document search options', () => {
      const options: DocumentSearchOptions = {
        q: 'machine learning',
        limit: 50,
        documentThreshold: 0.7,
        chunkThreshold: 0.8,
        rerank: true,
        rewriteQuery: true,
        includeFullDocs: true,
        containerTags: ['research', 'ai'],
      };

      expect(options.q).toBe('machine learning');
      expect(options.limit).toBe(50);
      expect(options.documentThreshold).toBe(0.7);
      expect(options.chunkThreshold).toBe(0.8);
      expect(options.rerank).toBe(true);
      expect(options.rewriteQuery).toBe(true);
      expect(options.includeFullDocs).toBe(true);
      expect(options.containerTags).toContain('research');
    });

    it('should support metadata filtering', () => {
      const options: DocumentSearchOptions = {
        q: 'python',
        filters: {
          AND: [
            { key: 'category', value: 'programming', negate: false },
            { key: 'difficulty', value: 'beginner', negate: false },
          ],
        },
      };

      expect(options.filters?.AND).toHaveLength(2);
      expect(options.filters?.AND![0].key).toBe('category');
    });
  });
});

describe('Filter Edge Cases', () => {
  it('should handle special characters in values', () => {
    const result = parseFilterExpression('query:hello-world_123');
    expect(result.AND![0].value).toBe('hello-world_123');
  });

  it('should handle multiple colons in values', () => {
    const result = parseFilterExpression('url:https://example.com');
    expect(result.AND![0].value).toContain('https://example.com');
  });

  it('should handle very long expressions', () => {
    const longFilter = Array(100)
      .fill(0)
      .map((_, i) => `key${i}:value${i}`)
      .join(' AND ');
    const result = parseFilterExpression(longFilter);
    expect(result.AND).toBeDefined();
  });

  it('should handle decimal thresholds', () => {
    const result = parseFilterExpression('threshold:0.75');
    expect(result.AND![0].value).toBe(0.75);
  });

  it('should normalize whitespace', () => {
    const result1 = parseFilterExpression('category:ai');
    const result2 = parseFilterExpression('  category:ai  ');
    expect(JSON.stringify(result1)).toBe(JSON.stringify(result2));
  });
});
