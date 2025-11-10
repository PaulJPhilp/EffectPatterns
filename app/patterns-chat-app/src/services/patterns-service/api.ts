import { Effect } from "effect";
import type { CacheError, PatternSearchError } from "./errors";
import type {
  CacheStats,
  MemoryRouterRequest,
  Pattern,
  PatternSearchResult,
} from "./types";

/**
 * PatternsService API
 * Service interface for pattern retrieval and management
 */

export interface PatternsServiceAPI {
  /**
   * Search for patterns in Supermemory
   * Implements retrieval-augmented generation for pattern discovery
   */
  searchPatterns(
    query: string,
    options?: Partial<MemoryRouterRequest>
  ): Effect.Effect<PatternSearchResult, PatternSearchError>;

  /**
   * Get patterns by skill level
   * Filters patterns by difficulty
   */
  getPatternsBySkillLevel(
    skillLevel: "beginner" | "intermediate" | "advanced",
    query?: string
  ): Effect.Effect<Pattern[], PatternSearchError>;

  /**
   * Get patterns by use case tag
   * Searches for patterns related to specific Effect-TS use cases
   */
  getPatternsByUseCase(
    useCase: string
  ): Effect.Effect<Pattern[], PatternSearchError>;

  /**
   * Clear the pattern cache
   * Useful for testing or forcing a refresh
   */
  clearCache(): Effect.Effect<void, CacheError>;

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): Effect.Effect<CacheStats, CacheError>;
}
