/**
 * Effect Patterns Toolkit
 *
 * Type-safe Effect library for working with Effect-TS patterns -
 * search, validate, and generate code from the Effect Patterns Hub
 */

// ============================================
// IO Operations (Legacy + Database)
// ============================================

export {
  // Legacy file-based loading
  loadPatternsFromJson,
  loadPatternsFromJsonRunnable,
  // Database-based loading
  loadPatternsFromDatabase,
  searchPatternsFromDatabase,
  getPatternFromDatabase,
} from "./io.js"

// ============================================
// Search Functions
// ============================================

export {
  // In-memory search (legacy)
  searchPatterns,
  getPatternById,
  toPatternSummary,
  type SearchPatternsParams,
  // Database search
  searchPatternsDb,
  getPatternByIdDb,
  countPatternsBySkillLevelDb,
  type DatabaseSearchParams,
} from "./search.js"

// ============================================
// Code Generation
// ============================================

export {
  buildSnippet,
  generateUsageExample,
  sanitizeInput,
  type BuildSnippetParams,
} from "./template.js"

// ============================================
// Schemas
// ============================================

export {
  Pattern,
  PatternSummary,
  PatternCategory,
  DifficultyLevel,
  CodeExample,
  PatternsIndex,
  type Pattern as PatternType,
  type PatternSummary as PatternSummaryType,
  type PatternCategory as PatternCategoryType,
  type DifficultyLevel as DifficultyLevelType,
  type CodeExample as CodeExampleType,
} from "./schemas/pattern.js"

export {
  GenerateRequest,
  type GenerateRequest as GenerateRequestType,
} from "./schemas/generate.js"

// ============================================
// Database Layer
// ============================================

export { createDatabase, getDatabaseUrl, type Database, type DatabaseConnection } from "./db/client.js"

export {
  // Schema types
  applicationPatterns,
  effectPatterns,
  jobs,
  patternJobs,
  patternRelations,
  skillLevels,
  jobStatuses,
  type ApplicationPattern as DbApplicationPattern,
  type NewApplicationPattern,
  type EffectPattern as DbEffectPattern,
  type NewEffectPattern,
  type Job as DbJob,
  type NewJob,
  type SkillLevel,
  type JobStatus,
  type CodeExample as DbCodeExample,
  type PatternRule,
} from "./db/schema/index.js"

// ============================================
// Repositories
// ============================================

export {
  createApplicationPatternRepository,
  ApplicationPatternNotFoundError,
  ApplicationPatternRepositoryError,
  type ApplicationPatternRepository,
  createEffectPatternRepository,
  EffectPatternNotFoundError,
  EffectPatternRepositoryError,
  type EffectPatternRepository,
  type SearchPatternsParams as RepositorySearchParams,
  createJobRepository,
  JobNotFoundError,
  JobRepositoryError,
  type JobRepository,
  type JobWithPatterns,
} from "./repositories/index.js"

// ============================================
// Database Services
// ============================================

export {
  DatabaseService,
  ApplicationPatternRepositoryService,
  EffectPatternRepositoryService,
  JobRepositoryService,
  DatabaseServiceLive,
  ApplicationPatternRepositoryLive,
  EffectPatternRepositoryLive,
  JobRepositoryLive,
  DatabaseLayer,
  findAllApplicationPatterns,
  findApplicationPatternBySlug,
  searchEffectPatterns,
  findEffectPatternBySlug,
  findPatternsByApplicationPattern,
  findJobsByApplicationPattern,
  getJobWithPatterns,
  getCoverageStats,
} from "./services/database.js"

// ============================================
// Utilities
// ============================================

export { splitSections } from "./splitSections.js"

// ============================================
// Errors
// ============================================

export {
  PatternLoadError,
  PatternNotFoundError,
  PatternValidationError,
  SearchError,
  TemplateError,
  ConfigurationError,
  CacheError,
  ServiceUnavailableError,
} from "./errors.js"
