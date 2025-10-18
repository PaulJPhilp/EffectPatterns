/**
 * Catalog service types
 *
 * The Catalog enriches PatternMeta with module placement data
 * and provides fast in-memory indices for lookups.
 */

import type { PatternMeta, SkillLevel } from '../pattern/types.js';

/**
 * Enriched pattern with full module placement data
 */
export type CatalogPattern = PatternMeta & {
  modules: Record<string, ModulePlacement>;
};

/**
 * Module placement with stage and position
 */
export interface ModulePlacement {
  stage: number | null;
  position: number;
  note?: string;
}

/**
 * Patterns grouped by stage within a module
 */
export interface ModuleStageGroup {
  stage: number | null;
  patterns: CatalogPattern[];
}

/**
 * Module view with patterns grouped by stage
 */
export interface ModuleView {
  moduleId: string;
  stages: ModuleStageGroup[];
}

/**
 * Catalog indices for fast lookups
 */
export interface CatalogIndices {
  byId: Map<string, CatalogPattern>;
  byTag: Map<string, Set<string>>; // tag -> pattern IDs
  byModule: Map<string, Set<string>>; // moduleId -> pattern IDs
  byModuleStage: Map<string, Set<string>>; // "moduleId:stage" -> pattern IDs
  bySkillLevel: Map<SkillLevel, Set<string>>; // skillLevel -> pattern IDs
}
