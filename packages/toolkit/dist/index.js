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
loadPatternsFromJson, loadPatternsFromJsonRunnable, 
// Database-based loading
loadPatternsFromDatabase, searchPatternsFromDatabase, getPatternFromDatabase, } from "./io.js";
// ============================================
// Search Functions
// ============================================
export { 
// In-memory search (legacy)
searchPatterns, getPatternById, toPatternSummary, 
// Database search
searchPatternsDb, getPatternByIdDb, countPatternsBySkillLevelDb, } from "./search.js";
// ============================================
// Code Generation
// ============================================
export { buildSnippet, generateUsageExample, sanitizeInput, } from "./template.js";
// ============================================
// Schemas
// ============================================
export { Pattern, PatternSummary, PatternCategory, DifficultyLevel, CodeExample, PatternsIndex, } from "./schemas/pattern.js";
export { GenerateRequest, } from "./schemas/generate.js";
// ============================================
// Database Layer
// ============================================
export { createDatabase, getDatabaseUrl } from "./db/client.js";
export { 
// Schema types
applicationPatterns, effectPatterns, jobs, patternJobs, patternRelations, skillLevels, jobStatuses, } from "./db/schema/index.js";
// ============================================
// Repositories
// ============================================
export { createApplicationPatternRepository, ApplicationPatternNotFoundError, ApplicationPatternRepositoryError, ApplicationPatternLockedError, createEffectPatternRepository, EffectPatternNotFoundError, EffectPatternRepositoryError, EffectPatternLockedError, createJobRepository, JobNotFoundError, JobRepositoryError, JobLockedError, } from "./repositories/index.js";
// ============================================
// Database Services
// ============================================
export { DatabaseService, ApplicationPatternRepositoryService, EffectPatternRepositoryService, JobRepositoryService, DatabaseServiceLive, ApplicationPatternRepositoryLive, EffectPatternRepositoryLive, JobRepositoryLive, DatabaseLayer, findAllApplicationPatterns, findApplicationPatternBySlug, searchEffectPatterns, findEffectPatternBySlug, findPatternsByApplicationPattern, findJobsByApplicationPattern, getJobWithPatterns, getCoverageStats, } from "./services/database.js";
// ============================================
// Utilities
// ============================================
export { splitSections } from "./splitSections.js";
// ============================================
// Errors
// ============================================
export { PatternLoadError, PatternNotFoundError, PatternValidationError, SearchError, TemplateError, ConfigurationError, CacheError, ServiceUnavailableError, } from "./errors.js";
//# sourceMappingURL=index.js.map