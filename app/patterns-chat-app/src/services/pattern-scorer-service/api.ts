import { Effect } from "effect";
import type { InvalidThresholdError, QueryValidationError } from "./errors";
import type {
  DetailedScoringResult,
  ScoringConfig,
  ScoringResult,
} from "./types";

/**
 * PatternScorerService API
 * Service interface for pattern scoring and relevance evaluation
 */

export interface PatternScorerServiceAPI {
  /**
   * Score a user query for pattern relevance
   * Returns a decision object with score, decision, and reasoning
   */
  scoreQuery(query: string): Effect.Effect<ScoringResult, QueryValidationError>;

  /**
   * Get detailed scoring breakdown for debugging
   */
  getDetailedScore(
    query: string
  ): Effect.Effect<DetailedScoringResult, QueryValidationError>;

  /**
   * Set minimum score threshold for pattern retrieval
   * Allows tuning the sensitivity of pattern suggestions
   */
  setMinimumThreshold(
    threshold: number
  ): Effect.Effect<void, InvalidThresholdError>;

  /**
   * Get current scoring configuration
   */
  getConfig(): Effect.Effect<ScoringConfig, never>;
}
