/**
 * Effect Patterns Toolkit
 *
 * Type-safe Effect library for working with Effect-TS patterns -
 * search, validate, and generate code from the Effect Patterns Hub
 */

// ============================================
// IO Operations (Database)
// ============================================

export {
    getPatternFromDatabase,
    loadPatternsFromDatabase,
    searchPatternsFromDatabase
} from "./io.js";

// ============================================
// Search Functions
// ============================================

export {
    countPatternsBySkillLevelDb,
    getPatternById,
    getPatternByIdDb,
    getSkillBySlugDb,
    // In-memory search (legacy)
    searchPatterns,
    // Database search
    searchPatternsDb,
    searchSkillsDb,
    toPatternSummary,
    type DatabaseSearchParams,
    type SearchPatternsParams,
    type SkillSearchParams,
    type SkillSummary
} from "./search.js";

// ============================================
// Code Generation
// ============================================

export {
    buildSnippet,
    generateUsageExample,
    sanitizeInput,
    type BuildSnippetParams
} from "./template.js";

// ============================================
// Schemas
// ============================================

export {
    CodeExample,
    DifficultyLevel,
    Pattern,
    PatternCategory,
    PatternSummary,
    PatternsIndex,
    type CodeExample as CodeExampleType,
    type DifficultyLevel as DifficultyLevelType,
    type PatternCategory as PatternCategoryType,
    type PatternSummary as PatternSummaryType,
    type Pattern as PatternType
} from "./schemas/pattern.js";

export {
    GenerateRequest,
    type GenerateRequest as GenerateRequestType
} from "./schemas/generate.js";

// ============================================
// Database Layer
// ============================================

export {
    createDatabase,
    getDatabaseUrl,
    type Database,
    type DatabaseConnection
} from "./db/client.js";

export {
    // Schema types
    applicationPatterns,
    effectPatterns,
    patternRelations,
    skillLevels,
    skillPatterns,
    skills,
    type ApplicationPattern as DbApplicationPattern,
    type CodeExample as DbCodeExample,
    type EffectPattern as DbEffectPattern,
    type NewApplicationPattern,
    type NewEffectPattern,
    type NewSkill,
    type NewSkillPattern,
    type PatternRule,
    type Skill as DbSkill,
    type SkillLevel,
    type SkillPattern,
} from "./db/schema/index.js";

// ============================================
// Repositories
// ============================================

export {
    ApplicationPatternLockedError,
    ApplicationPatternNotFoundError,
    ApplicationPatternRepositoryError,
    EffectPatternLockedError,
    EffectPatternNotFoundError,
    EffectPatternRepositoryError,
    SkillLockedError,
    SkillNotFoundError,
    SkillRepositoryError,
    createApplicationPatternRepository,
    createEffectPatternRepository,
    createSkillRepository,
    type ApplicationPatternRepository,
    type EffectPatternRepository,
    type SearchPatternsParams as RepositorySearchParams,
    type SearchSkillsParams,
    type SkillRepository,
} from "./repositories/index.js";

// ============================================
// Database Services
// ============================================

export {
    ApplicationPatternRepositoryLive,
    ApplicationPatternRepositoryService,
    DatabaseLayer,
    DatabaseService,
    DatabaseServiceLive,
    EffectPatternRepositoryLive,
    EffectPatternRepositoryService,
    SkillRepositoryLive,
    SkillRepositoryService,
    findAllApplicationPatterns,
    findApplicationPatternBySlug,
    findEffectPatternBySlug,
    findPatternsByApplicationPattern,
    searchEffectPatterns
} from "./services/database.js";

// ============================================
// Utilities
// ============================================

export { splitSections } from "./splitSections.js";

// ============================================
// Errors
// ============================================

export {
    ToolkitConfig,
    type ToolkitConfigType
} from "./services/config.js";

export {
    LogLevel as ToolkitLogLevel,
    ToolkitLogger,
    type LogEntry as ToolkitLogEntry
} from "./services/logger.js";

export {
    CacheError,
    ConfigurationError,
    PatternLoadError,
    PatternNotFoundError,
    PatternValidationError,
    SearchError,
    ServiceUnavailableError,
    TemplateError
} from "./errors.js";

