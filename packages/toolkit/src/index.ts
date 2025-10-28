/**
 * Effect Patterns Toolkit
 *
 * Type-safe Effect library for working with Effect-TS patterns -
 * search, validate, and generate code from the Effect Patterns Hub
 */

// IO Operations
export {
  loadPatternsFromJson,
  loadPatternsFromJsonRunnable,
} from './io.js';

// Search Functions
export {
  searchPatterns,
  getPatternById,
  toPatternSummary,
  type SearchPatternsParams,
} from './search.js';

// Code Generation
export {
  buildSnippet,
  generateUsageExample,
  sanitizeInput,
  type BuildSnippetParams,
} from './template.js';

// Schemas
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
} from './schemas/pattern.js';

export {
  GenerateRequest,
  type GenerateRequest as GenerateRequestType,
} from './schemas/generate.js';

// Utilities
export { splitSections } from './splitSections.js';

// Errors
export {
  PatternLoadError,
  PatternNotFoundError,
  PatternValidationError,
  SearchError,
  TemplateError,
  ConfigurationError,
  CacheError,
  ServiceUnavailableError,
} from './errors.js';
