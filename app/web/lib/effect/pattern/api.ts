/**
 * PatternRepository interface definition
 *
 * Focused on repository operations - no business logic
 */

import type { Effect } from 'effect';
import type { PatternNotFound, PatternQueryError } from './errors.js';
import type {
  PageParams,
  PageResult,
  PatternFilter,
  PatternID,
  PatternMeta,
} from './types.js';

export interface PatternRepository {
  /**
   * Find pattern by ID
   */
  findById: (
    id: PatternID
  ) => Effect.Effect<PatternMeta, PatternNotFound | PatternQueryError>;

  /**
   * Find all patterns with pagination
   */
  findAll: (
    params?: PageParams
  ) => Effect.Effect<PageResult<PatternMeta>, PatternQueryError>;

  /**
   * Find patterns by tag with pagination
   */
  findByTag: (
    tag: string,
    params?: PageParams
  ) => Effect.Effect<PageResult<PatternMeta>, PatternQueryError>;

  /**
   * Search patterns with filters and pagination
   */
  search: (
    filter: PatternFilter,
    params?: PageParams
  ) => Effect.Effect<PageResult<PatternMeta>, PatternQueryError>;

  /**
   * List patterns by module ID, ordered by stage and position
   *
   * @param moduleId - Module ID to filter by
   * @param stage - Optional stage filter
   * @returns Array of patterns ordered by stage ASC NULLS LAST, position ASC
   */
  listByModule: (
    moduleId: string,
    stage?: number
  ) => Effect.Effect<readonly PatternMeta[], PatternQueryError>;
}
