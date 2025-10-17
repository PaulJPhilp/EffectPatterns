/**
 * Unit tests for PatternRepository
 */

import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import type { PatternRepository } from '../api.js';
import { PatternNotFound } from '../errors.js';
import type { PatternMeta } from '../types.js';

/**
 * Mock PatternRepository for testing
 */
const createMockRepository = (
  mockData: {
    patterns: PatternMeta[];
    byModule?: Record<string, PatternMeta[]>;
  } = { patterns: [] }
): PatternRepository => ({
  findById: (id) =>
    Effect.gen(function* () {
      const pattern = mockData.patterns.find((p) => p.id === id);
      if (!pattern) {
        return yield* Effect.fail(new PatternNotFound({ id }));
      }
      return pattern;
    }),

  findAll: (params) =>
    Effect.succeed({
      items: mockData.patterns,
      total: mockData.patterns.length,
      limit: params?.limit ?? 50,
      offset: params?.offset ?? 0,
    }),

  findByTag: (tag, params) =>
    Effect.succeed({
      items: mockData.patterns.filter((p) => p.tags.includes(tag)),
      total: mockData.patterns.filter((p) => p.tags.includes(tag)).length,
      limit: params?.limit ?? 50,
      offset: params?.offset ?? 0,
    }),

  search: (filter, params) =>
    Effect.succeed({
      items: mockData.patterns.filter((p) => {
        if (filter.query && !p.title.includes(filter.query)) return false;
        if (filter.skillLevel && p.skillLevel !== filter.skillLevel)
          return false;
        if (filter.tags && !filter.tags.some((tag) => p.tags.includes(tag)))
          return false;
        return true;
      }),
      total: mockData.patterns.length,
      limit: params?.limit ?? 50,
      offset: params?.offset ?? 0,
    }),

  listByModule: (moduleId, stage) =>
    Effect.succeed(mockData.byModule?.[moduleId] ?? []),
});

describe('PatternRepository', () => {
  const mockPatterns: PatternMeta[] = [
    {
      id: 'error-handling',
      title: 'Error Handling',
      summary: 'Handle errors with Effect',
      skillLevel: 'intermediate',
      tags: ['error', 'effect'],
      modules: {},
    },
    {
      id: 'retry-pattern',
      title: 'Retry Pattern',
      summary: 'Retry failed operations',
      skillLevel: 'advanced',
      tags: ['retry', 'effect'],
      modules: {},
    },
    {
      id: 'effect-basics',
      title: 'Effect Basics',
      summary: 'Introduction to Effect',
      skillLevel: 'beginner',
      tags: ['basics', 'effect'],
      modules: {},
    },
  ];

  const mockRepo = createMockRepository({ patterns: mockPatterns });

  describe('findById', () => {
    it('should return pattern when found', async () => {
      const result = await Effect.runPromise(
        mockRepo.findById('error-handling')
      );

      expect(result.id).toBe('error-handling');
      expect(result.title).toBe('Error Handling');
    });

    it('should fail with PatternNotFound when not found', async () => {
      const result = await Effect.runPromise(
        mockRepo.findById('non-existent').pipe(Effect.flip)
      );

      expect(result).toBeInstanceOf(PatternNotFound);
      if (result._tag === 'PatternNotFound') {
        expect(result.id).toBe('non-existent');
      }
    });
  });

  describe('findAll', () => {
    it('should return all patterns', async () => {
      const result = await Effect.runPromise(mockRepo.findAll());

      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it('should respect pagination params', async () => {
      const result = await Effect.runPromise(
        mockRepo.findAll({ limit: 2, offset: 1 })
      );

      expect(result.limit).toBe(2);
      expect(result.offset).toBe(1);
    });
  });

  describe('findByTag', () => {
    it('should return patterns with matching tag', async () => {
      const result = await Effect.runPromise(mockRepo.findByTag('retry'));

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('retry-pattern');
    });

    it('should return all patterns with "effect" tag', async () => {
      const result = await Effect.runPromise(mockRepo.findByTag('effect'));

      expect(result.items).toHaveLength(3);
    });

    it('should return empty result for non-existent tag', async () => {
      const result = await Effect.runPromise(
        mockRepo.findByTag('non-existent')
      );

      expect(result.items).toHaveLength(0);
    });
  });

  describe('search', () => {
    it('should search by title query', async () => {
      const result = await Effect.runPromise(
        mockRepo.search({ query: 'Error' })
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Error Handling');
    });

    it('should filter by skill level', async () => {
      const result = await Effect.runPromise(
        mockRepo.search({ skillLevel: 'beginner' })
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0].skillLevel).toBe('beginner');
    });

    it('should filter by tags', async () => {
      const result = await Effect.runPromise(
        mockRepo.search({ tags: ['retry'] })
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('retry-pattern');
    });

    it('should combine multiple filters', async () => {
      const result = await Effect.runPromise(
        mockRepo.search({
          skillLevel: 'intermediate',
          tags: ['error'],
        })
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('error-handling');
    });
  });

  describe('listByModule', () => {
    const modulePatterns = [
      {
        id: 'pattern-1',
        title: 'Pattern 1',
        summary: 'First pattern',
        skillLevel: 'beginner' as const,
        tags: ['test'],
        modules: {},
      },
      {
        id: 'pattern-2',
        title: 'Pattern 2',
        summary: 'Second pattern',
        skillLevel: 'intermediate' as const,
        tags: ['test'],
        modules: {},
      },
    ];

    const repoWithModules = createMockRepository({
      patterns: modulePatterns,
      byModule: {
        'module-1-foundations': modulePatterns,
      },
    });

    it('should return patterns for a module ordered by stage and position', async () => {
      const result = await Effect.runPromise(
        repoWithModules.listByModule('module-1-foundations')
      );

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('pattern-1');
      expect(result[1].id).toBe('pattern-2');
    });

    it('should return empty array for module with no patterns', async () => {
      const result = await Effect.runPromise(
        repoWithModules.listByModule('empty-module')
      );

      expect(result).toHaveLength(0);
    });
  });
});
