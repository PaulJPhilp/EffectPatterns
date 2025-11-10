/**
 * Services Index
 * Centralized export point for all services
 */

// PatternsService
export { PatternsService } from "./patterns-service/service";
export type { PatternsServiceAPI } from "./patterns-service/api";
export type {
  Pattern,
  PatternSearchResult,
  MemoryRouterRequest,
  MemoryRouterResponse,
  CacheEntry,
  CacheStats,
} from "./patterns-service/types";
export {
  PatternsServiceError,
  PatternNotFoundError,
  PatternSearchError,
  MemoryRouterError,
  CacheError,
} from "./patterns-service/errors";

// PatternScorerService
export { PatternScorerService } from "./pattern-scorer-service/service";
export type { PatternScorerServiceAPI } from "./pattern-scorer-service/api";
export type {
  ScoringResult,
  DetailedScoringResult,
  PatternKeywords,
  ScoringConfig,
  KeywordMatch,
} from "./pattern-scorer-service/types";
export {
  PatternScorerError,
  InvalidThresholdError,
  QueryValidationError,
} from "./pattern-scorer-service/errors";

