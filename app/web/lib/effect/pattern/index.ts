/**
 * Pattern Repository - Public exports
 */

// API
export type { PatternRepository } from './api.js';
export type { PatternError } from './errors.js';

// Errors
export { PatternNotFound, PatternQueryError } from './errors.js';
// Schemas
export {
  PageParamsSchema,
  PatternFilterSchema,
  SkillLevelSchema
} from './schema.js';
// Service
export {
  PatternRepositoryService
} from './service.js';
// Types
export type {
  DbPatternRow,
  ModulePlacement,
  PageParams,
  PageResult,
  PatternFilter,
  PatternID,
  PatternMeta,
  SkillLevel
} from './types.js';

// Utils
export { toPatternMeta } from './utils.js';
