/**
 * Services Index
 * Centralized export point for all services
 */

// PatternsService
export type { PatternsServiceAPI } from "./patterns-service/api";
export {
  CacheError,
  MemoryRouterError,
  PatternNotFoundError,
  PatternSearchError,
  PatternsServiceError,
} from "./patterns-service/errors";
export { PatternsService } from "./patterns-service/service";
export type {
  CacheEntry,
  CacheStats,
  MemoryRouterRequest,
  MemoryRouterResponse,
  Pattern,
  PatternSearchResult,
} from "./patterns-service/types";

// PatternScorerService
export type { PatternScorerServiceAPI } from "./pattern-scorer-service/api";
export {
  InvalidThresholdError,
  PatternScorerError,
  QueryValidationError,
} from "./pattern-scorer-service/errors";
export { PatternScorerService } from "./pattern-scorer-service/service";
export type {
  DetailedScoringResult,
  KeywordMatch,
  PatternKeywords,
  ScoringConfig,
  ScoringResult,
} from "./pattern-scorer-service/types";
