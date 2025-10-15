/**
 * Effect Patterns Toolkit
 *
 * Canonical domain types, pure functions, and utilities for working
 * with Effect patterns. All business logic is implemented using Effect
 * primitives.
 */

// Export pure functions
export { loadPatternsFromJson, loadPatternsFromJsonRunnable } from './io.js';
// Export schemas
export {
  ExplainPatternRequest,
  GenerateRequest,
  GenerateResponse,
  ModuleType,
  SearchPatternsRequest,
  SearchPatternsResponse,
} from './schemas/generate.js';
export {
  Pattern,
  PatternSummary,
  PatternsIndex,
} from './schemas/pattern.js';
export {
  getPatternById,
  searchPatterns,
  toPatternSummary,
  type SearchPatternsParams,
} from './search.js';
export { splitSections } from './splitSections.js';
export {
  buildSnippet,
  generateUsageExample,
  sanitizeInput,
  type BuildSnippetParams,
} from './template.js';
