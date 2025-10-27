/**
 * Catalog service API
 *
 * High-level service that provides fast in-memory access to patterns
 * with full module placement data.
 */

import type { Effect } from 'effect';
import type { SkillLevel } from '../pattern/types.js';
import type { CatalogError } from './errors.js';
import type { CatalogPattern, ModuleView } from './types.js';

export interface Catalog {
  /**
   * Get pattern by ID with full module placement data
   */
  getById: (id: string) => Effect.Effect<CatalogPattern, CatalogError>;

  /**
   * Get all patterns
   */
  getAll: () => Effect.Effect<readonly CatalogPattern[], CatalogError>;

  /**
   * Get patterns by tag
   */
  getByTag: (
    tag: string
  ) => Effect.Effect<readonly CatalogPattern[], CatalogError>;

  /**
   * Get patterns by skill level
   */
  getBySkillLevel: (
    level: SkillLevel
  ) => Effect.Effect<readonly CatalogPattern[], CatalogError>;

  /**
   * Get module view with patterns grouped by stage
   */
  getModuleView: (moduleId: string) => Effect.Effect<ModuleView, CatalogError>;

  /**
   * Get patterns for a specific module and stage
   */
  getModuleStage: (
    moduleId: string,
    stage: number | null
  ) => Effect.Effect<readonly CatalogPattern[], CatalogError>;

  /**
   * Refresh catalog from database
   */
  refresh: () => Effect.Effect<void, CatalogError>;
}
