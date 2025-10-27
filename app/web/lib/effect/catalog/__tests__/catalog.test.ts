/**
 * Unit tests for Catalog service
 */

import { Effect, Ref } from 'effect';
import { describe, expect, it } from 'vitest';
import type { Catalog } from '../api.js';
import { CatalogNotInitialized } from '../errors.js';
import type { CatalogIndices, CatalogPattern } from '../types.js';

/**
 * Create mock catalog for testing
 */
const createMockCatalog = (
  patterns: CatalogPattern[]
): Effect.Effect<Catalog, never> =>
  Effect.gen(function* () {
    const buildMockIndices = (): CatalogIndices => {
      const byId = new Map<string, CatalogPattern>();
      const byTag = new Map<string, Set<string>>();
      const byModule = new Map<string, Set<string>>();
      const byModuleStage = new Map<string, Set<string>>();
      const bySkillLevel = new Map<
        'beginner' | 'intermediate' | 'advanced',
        Set<string>
      >();

      for (const pattern of patterns) {
        byId.set(pattern.id, pattern);

        for (const tag of pattern.tags) {
          if (!byTag.has(tag)) byTag.set(tag, new Set());
          byTag.get(tag)!.add(pattern.id);
        }

        if (!bySkillLevel.has(pattern.skillLevel)) {
          bySkillLevel.set(pattern.skillLevel, new Set());
        }
        bySkillLevel.get(pattern.skillLevel)!.add(pattern.id);

        for (const [moduleId, placement] of Object.entries(pattern.modules)) {
          if (!byModule.has(moduleId)) byModule.set(moduleId, new Set());
          byModule.get(moduleId)!.add(pattern.id);

          const stageKey = `${moduleId}:${placement.stage ?? 'null'}`;
          if (!byModuleStage.has(stageKey)) {
            byModuleStage.set(stageKey, new Set());
          }
          byModuleStage.get(stageKey)!.add(pattern.id);
        }
      }

      return { byId, byTag, byModule, byModuleStage, bySkillLevel };
    };

    // Initialize indices
    const indicesRef = yield* Ref.make<CatalogIndices | null>(
      buildMockIndices()
    );

    const getIndices = Effect.gen(function* () {
      const indices = yield* Ref.get(indicesRef);
      if (!indices) {
        return yield* Effect.fail(
          new CatalogNotInitialized({
            message: 'Catalog not initialized',
          })
        );
      }
      return indices;
    });

    return {
      getById: (id) =>
        Effect.gen(function* () {
          const indices = yield* getIndices;
          const pattern = indices.byId.get(id);
          if (!pattern) {
            return yield* Effect.fail(
              new CatalogNotInitialized({ message: `Pattern not found: ${id}` })
            );
          }
          return pattern;
        }),

      getAll: () =>
        Effect.gen(function* () {
          const indices = yield* getIndices;
          return Array.from(indices.byId.values());
        }),

      getByTag: (tag) =>
        Effect.gen(function* () {
          const indices = yield* getIndices;
          const ids = indices.byTag.get(tag) ?? new Set();
          return Array.from(ids)
            .map((id) => indices.byId.get(id))
            .filter((p): p is CatalogPattern => p !== undefined);
        }),

      getBySkillLevel: (level) =>
        Effect.gen(function* () {
          const indices = yield* getIndices;
          const ids = indices.bySkillLevel.get(level) ?? new Set();
          return Array.from(ids)
            .map((id) => indices.byId.get(id))
            .filter((p): p is CatalogPattern => p !== undefined);
        }),

      getModuleView: (moduleId) =>
        Effect.gen(function* () {
          const indices = yield* getIndices;
          const ids = indices.byModule.get(moduleId) ?? new Set();
          const modulePatterns = Array.from(ids)
            .map((id) => indices.byId.get(id))
            .filter((p): p is CatalogPattern => p !== undefined);

          const stageMap = new Map<number | null, CatalogPattern[]>();
          for (const pattern of modulePatterns) {
            const placement = pattern.modules[moduleId];
            if (placement) {
              if (!stageMap.has(placement.stage)) {
                stageMap.set(placement.stage, []);
              }
              stageMap.get(placement.stage)!.push(pattern);
            }
          }

          for (const patterns of stageMap.values()) {
            patterns.sort((a, b) => {
              const posA = a.modules[moduleId]?.position ?? 0;
              const posB = b.modules[moduleId]?.position ?? 0;
              return posA - posB;
            });
          }

          const stages = Array.from(stageMap.entries())
            .sort(([a], [b]) => {
              if (a === null) return 1;
              if (b === null) return -1;
              return a - b;
            })
            .map(([stage, patterns]) => ({ stage, patterns }));

          return { moduleId, stages };
        }),

      getModuleStage: (moduleId, stage) =>
        Effect.gen(function* () {
          const indices = yield* getIndices;
          const stageKey = `${moduleId}:${stage ?? 'null'}`;
          const ids = indices.byModuleStage.get(stageKey) ?? new Set();

          const patterns = Array.from(ids)
            .map((id) => indices.byId.get(id))
            .filter((p): p is CatalogPattern => p !== undefined);

          patterns.sort((a, b) => {
            const posA = a.modules[moduleId]?.position ?? 0;
            const posB = b.modules[moduleId]?.position ?? 0;
            return posA - posB;
          });

          return patterns;
        }),

      refresh: () => Effect.void,
    };
  });

describe('Catalog', () => {
  const mockPatterns: CatalogPattern[] = [
    {
      id: 'pattern-1',
      title: 'Pattern 1',
      summary: 'First pattern',
      skillLevel: 'beginner',
      tags: ['basic', 'intro'],
      modules: {
        'module-1-foundations': { stage: 1, position: 1 },
      },
    },
    {
      id: 'pattern-2',
      title: 'Pattern 2',
      summary: 'Second pattern',
      skillLevel: 'intermediate',
      tags: ['basic', 'advanced'],
      modules: {
        'module-1-foundations': { stage: 1, position: 2 },
        'module-2-web-api': { stage: 2, position: 1 },
      },
    },
    {
      id: 'pattern-3',
      title: 'Pattern 3',
      summary: 'Third pattern',
      skillLevel: 'advanced',
      tags: ['advanced'],
      modules: {
        'module-2-web-api': { stage: null, position: 1 },
      },
    },
  ];

  describe('getById', () => {
    it('should return pattern by id', async () => {
      const catalog = await Effect.runPromise(createMockCatalog(mockPatterns));
      const result = await Effect.runPromise(catalog.getById('pattern-1'));
      expect(result.id).toBe('pattern-1');
      expect(result.title).toBe('Pattern 1');
    });

    it('should fail when pattern not found', async () => {
      const catalog = await Effect.runPromise(createMockCatalog(mockPatterns));
      const result = await Effect.runPromise(
        catalog.getById('non-existent').pipe(Effect.flip)
      );
      expect(result).toBeInstanceOf(CatalogNotInitialized);
    });
  });

  describe('getAll', () => {
    it('should return all patterns', async () => {
      const catalog = await Effect.runPromise(createMockCatalog(mockPatterns));
      const result = await Effect.runPromise(catalog.getAll());
      expect(result).toHaveLength(3);
    });
  });

  describe('getByTag', () => {
    it('should return patterns by tag', async () => {
      const catalog = await Effect.runPromise(createMockCatalog(mockPatterns));
      const result = await Effect.runPromise(catalog.getByTag('basic'));
      expect(result).toHaveLength(2);
      expect(result.map((p) => p.id)).toContain('pattern-1');
      expect(result.map((p) => p.id)).toContain('pattern-2');
    });

    it('should return empty for non-existent tag', async () => {
      const catalog = await Effect.runPromise(createMockCatalog(mockPatterns));
      const result = await Effect.runPromise(catalog.getByTag('non-existent'));
      expect(result).toHaveLength(0);
    });
  });

  describe('getBySkillLevel', () => {
    it('should return patterns by skill level', async () => {
      const catalog = await Effect.runPromise(createMockCatalog(mockPatterns));
      const result = await Effect.runPromise(
        catalog.getBySkillLevel('beginner')
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('pattern-1');
    });
  });

  describe('getModuleView', () => {
    it('should return module view with stages', async () => {
      const catalog = await Effect.runPromise(createMockCatalog(mockPatterns));
      const result = await Effect.runPromise(
        catalog.getModuleView('module-1-foundations')
      );

      expect(result.moduleId).toBe('module-1-foundations');
      expect(result.stages).toHaveLength(1);
      expect(result.stages[0].stage).toBe(1);
      expect(result.stages[0].patterns).toHaveLength(2);
    });

    it('should order patterns by position within stage', async () => {
      const catalog = await Effect.runPromise(createMockCatalog(mockPatterns));
      const result = await Effect.runPromise(
        catalog.getModuleView('module-1-foundations')
      );

      const stage1 = result.stages[0];
      expect(stage1.patterns[0].id).toBe('pattern-1');
      expect(stage1.patterns[1].id).toBe('pattern-2');
    });

    it('should place null stages last', async () => {
      const catalog = await Effect.runPromise(createMockCatalog(mockPatterns));
      const result = await Effect.runPromise(
        catalog.getModuleView('module-2-web-api')
      );

      expect(result.stages).toHaveLength(2);
      expect(result.stages[0].stage).toBe(2);
      expect(result.stages[1].stage).toBe(null);
    });
  });

  describe('getModuleStage', () => {
    it('should return patterns for specific stage', async () => {
      const catalog = await Effect.runPromise(createMockCatalog(mockPatterns));
      const result = await Effect.runPromise(
        catalog.getModuleStage('module-1-foundations', 1)
      );

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('pattern-1');
      expect(result[1].id).toBe('pattern-2');
    });

    it('should return patterns for null stage', async () => {
      const catalog = await Effect.runPromise(createMockCatalog(mockPatterns));
      const result = await Effect.runPromise(
        catalog.getModuleStage('module-2-web-api', null)
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('pattern-3');
    });
  });
});
