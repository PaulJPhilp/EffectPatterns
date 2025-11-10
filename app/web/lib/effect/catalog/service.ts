/**
 * Catalog service implementation
 *
 * Loads patterns + placements into memory and provides fast indexed access.
 */

import { Effect, Ref } from 'effect';
import { db } from '../../db/client.js';
import { patternModulePlacements, patterns } from '../../db/schema.js';
import type { DbPatternRow, SkillLevel } from '../pattern/types.js';
import { toPatternMeta } from '../pattern/utils.js';
import { CatalogLoadError, CatalogNotInitialized } from './errors.js';
import type {
  CatalogIndices,
  CatalogPattern,
  ModulePlacement,
  ModuleStageGroup,
} from './types.js';

/**
 * Catalog service implementation
 */
export class CatalogService extends Effect.Service<CatalogService>()(
  'CatalogService',
  {
    scoped: () =>
      Effect.gen(function* () {
        const indicesRef = yield* Ref.make<CatalogIndices | null>(null);
        const catalog = makeCatalog(indicesRef);
        yield* catalog.refresh();
        return catalog;
      }),
  }
) {}

/**
 * Build indices from enriched patterns
 */
const buildIndices = (enrichedPatterns: CatalogPattern[]): CatalogIndices => {
  const byId = new Map<string, CatalogPattern>();
  const byTag = new Map<string, Set<string>>();
  const byModule = new Map<string, Set<string>>();
  const byModuleStage = new Map<string, Set<string>>();
  const bySkillLevel = new Map<SkillLevel, Set<string>>();

  for (const pattern of enrichedPatterns) {
    // byId
    byId.set(pattern.id, pattern);

    // byTag
    for (const tag of pattern.tags) {
      if (!byTag.has(tag)) {
        byTag.set(tag, new Set());
      }
      byTag.get(tag)!.add(pattern.id);
    }

    // bySkillLevel
    if (!bySkillLevel.has(pattern.skillLevel)) {
      bySkillLevel.set(pattern.skillLevel, new Set());
    }
    bySkillLevel.get(pattern.skillLevel)!.add(pattern.id);

    // byModule and byModuleStage
    for (const [moduleId, placement] of Object.entries(pattern.modules)) {
      if (!byModule.has(moduleId)) {
        byModule.set(moduleId, new Set());
      }
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

/**
 * Load patterns and placements from database and build enriched catalog
 */
const loadCatalog = () =>
  Effect.gen(function* () {
    // Load all patterns
    const patternsData = yield* Effect.tryPromise({
      try: () => db.select().from(patterns),
      catch: (cause) =>
        new CatalogLoadError({
          message: 'Failed to load patterns from database',
          cause,
        }),
    });

    // Load all placements
    const placementsData = yield* Effect.tryPromise({
      try: () => db.select().from(patternModulePlacements),
      catch: (cause) =>
        new CatalogLoadError({
          message: 'Failed to load placements from database',
          cause,
        }),
    });

    // Build placements map: patternId -> { moduleId -> placement }
    const placementsMap = new Map<string, Record<string, ModulePlacement>>();

    for (const placement of placementsData) {
      if (!placementsMap.has(placement.patternId)) {
        placementsMap.set(placement.patternId, {});
      }
      placementsMap.get(placement.patternId)![placement.moduleId] = {
        stage: placement.stage,
        position: placement.position,
        note: placement.note ?? undefined,
      };
    }

    // Enrich patterns with module placements
    const enrichedPatterns: CatalogPattern[] = patternsData.map((p) => {
      const base = toPatternMeta(p as unknown as DbPatternRow);
      return {
        ...base,
        modules: placementsMap.get(p.id) ?? {},
      };
    });

    // Build indices
    const indices = buildIndices(enrichedPatterns);

    return indices;
  });

/**
 * Make Catalog service implementation
 */
const makeCatalog = (indicesRef: Ref.Ref<CatalogIndices | null>) => {
  const getIndices = Effect.gen(function* () {
    const indices = yield* Ref.get(indicesRef);
    if (!indices) {
      return yield* Effect.fail(
        new CatalogNotInitialized({
          message: 'Catalog not initialized. Call refresh() first.',
        })
      );
    }
    return indices;
  });

  return {
    getById: (id: string) =>
      Effect.gen(function* () {
        const indices = yield* getIndices;
        const pattern = indices.byId.get(id);
        if (!pattern) {
          return yield* Effect.fail(
            new CatalogNotInitialized({
              message: `Pattern not found: ${id}`,
            })
          );
        }
        return pattern;
      }),

    getAll: () =>
      Effect.gen(function* () {
        const indices = yield* getIndices;
        return Array.from(indices.byId.values());
      }),

    getByTag: (tag: string) =>
      Effect.gen(function* () {
        const indices = yield* getIndices;
        const patternIds = indices.byTag.get(tag) ?? new Set();
        return Array.from(patternIds)
          .map((id) => indices.byId.get(id))
          .filter((p): p is CatalogPattern => p !== undefined);
      }),

    getBySkillLevel: (level: SkillLevel) =>
      Effect.gen(function* () {
        const indices = yield* getIndices;
        const patternIds = indices.bySkillLevel.get(level) ?? new Set();
        return Array.from(patternIds)
          .map((id) => indices.byId.get(id))
          .filter((p): p is CatalogPattern => p !== undefined);
      }),

    getModuleView: (moduleId: string) =>
      Effect.gen(function* () {
        const indices = yield* getIndices;
        const patternIds = indices.byModule.get(moduleId) ?? new Set();

        // Get all patterns for this module
        const modulePatterns = Array.from(patternIds)
          .map((id) => indices.byId.get(id))
          .filter((p): p is CatalogPattern => p !== undefined);

        // Group by stage
        const stageMap = new Map<number | null, CatalogPattern[]>();

        for (const pattern of modulePatterns) {
          const placement = pattern.modules[moduleId];
          if (placement) {
            const stage = placement.stage;
            if (!stageMap.has(stage)) {
              stageMap.set(stage, []);
            }
            stageMap.get(stage)!.push(pattern);
          }
        }

        // Sort patterns within each stage by position
        for (const patterns of stageMap.values()) {
          patterns.sort((a, b) => {
            const posA = a.modules[moduleId]?.position ?? 0;
            const posB = b.modules[moduleId]?.position ?? 0;
            return posA - posB;
          });
        }

        // Build stage groups, sorted by stage (null last)
        const stages: ModuleStageGroup[] = Array.from(stageMap.entries())
          .sort(([a], [b]) => {
            if (a === null) return 1;
            if (b === null) return -1;
            return a - b;
          })
          .map(([stage, patterns]) => ({ stage, patterns }));

        return { moduleId, stages };
      }),

    getModuleStage: (moduleId: string, stage: number | null) =>
      Effect.gen(function* () {
        const indices = yield* getIndices;
        const stageKey = `${moduleId}:${stage ?? 'null'}`;
        const patternIds = indices.byModuleStage.get(stageKey) ?? new Set();

        const patterns = Array.from(patternIds)
          .map((id) => indices.byId.get(id))
          .filter((p): p is CatalogPattern => p !== undefined);

        // Sort by position
        patterns.sort((a, b) => {
          const posA = a.modules[moduleId]?.position ?? 0;
          const posB = b.modules[moduleId]?.position ?? 0;
          return posA - posB;
        });

        return patterns;
      }),

    refresh: () =>
      Effect.gen(function* () {
        const newIndices = yield* loadCatalog();
        yield* Ref.set(indicesRef, newIndices);
      }),
  };
};

/**
 * Catalog service default layer
 */
export const CatalogLive = CatalogService.Default;
