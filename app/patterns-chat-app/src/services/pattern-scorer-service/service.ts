import { Data, Effect, Ref } from "effect";
import type { ScoringResult, DetailedScoringResult, ScoringConfig } from "./types";
import type { PatternScorerServiceAPI } from "./api";
import {
  InvalidThresholdError,
  QueryValidationError,
} from "./errors";
import {
  hasNegation,
  scoreEffectSpecificity,
  matchTopics,
  scoreGuidance,
} from "./helpers";

/**
 * PatternScorerService Implementation
 * Scores user queries to determine if pattern retrieval is beneficial
 */

interface ScorerContext {
  config: Ref.Ref<ScoringConfig>;
}

/**
 * Create PatternScorerService implementation
 */
const makePatternScorerService = Effect.gen(function* () {
  const config = yield* Ref.make<ScoringConfig>({
    minScoreForPatterns: 0.5,
    effectKeywordWeight: 0.4,
    topicMatchWeight: 0.35,
    guidanceIndicatorWeight: 0.25,
  });

  const context: ScorerContext = { config };

  /**
   * Score a user query for pattern relevance
   */
  const scoreQuery = (query: string): Effect.Effect<ScoringResult, QueryValidationError> =>
    Effect.gen(function* () {
      if (!query || query.trim().length === 0) {
        return yield* Effect.fail(
          new QueryValidationError({
            query,
            message: "Query cannot be empty",
          })
        );
      }

      const normalizedQuery = query.toLowerCase();
      const reasons: string[] = [];
      const suggestedTopics = new Set<string>();
      const cfg = yield* Ref.get(context.config);

      let score = 0;

      // 1. Check for explicit "no patterns" indicators
      if (hasNegation(normalizedQuery)) {
        return {
          needsPatterns: false,
          score: 0,
          reasons: ["User explicitly indicated no patterns needed"],
        };
      }

      // 2. Effect-TS specificity (strong signal)
      const effectScore = scoreEffectSpecificity(normalizedQuery);
      if (effectScore > 0) {
        score += effectScore * cfg.effectKeywordWeight;
        reasons.push(`Effect-TS specificity: ${(effectScore * 100).toFixed(0)}%`);
      }

      // 3. Topic matching (strong signal)
      const topicMatch = matchTopics(normalizedQuery);
      if (topicMatch.score > 0) {
        score += topicMatch.score * cfg.topicMatchWeight;
        reasons.push(`Topic match: ${topicMatch.topics.join(", ")}`);
        topicMatch.topics.forEach((t) => suggestedTopics.add(t));
      }

      // 4. Learning/guidance indicators (moderate signal)
      const guidanceScore = scoreGuidance(normalizedQuery);
      if (guidanceScore > 0) {
        score += guidanceScore * cfg.guidanceIndicatorWeight;
        reasons.push("Learning/guidance indicators present");
      }

      // Normalize score to 0-1 range
      score = Math.min(1, score);

      return {
        needsPatterns: score >= cfg.minScoreForPatterns,
        score,
        reasons,
        suggestedTopics: Array.from(suggestedTopics),
      };
    });

  /**
   * Get detailed scoring breakdown for debugging
   */
  const getDetailedScore = (
    query: string
  ): Effect.Effect<DetailedScoringResult, QueryValidationError> =>
    Effect.gen(function* () {
      if (!query || query.trim().length === 0) {
        return yield* Effect.fail(
          new QueryValidationError({
            query,
            message: "Query cannot be empty",
          })
        );
      }

      const normalizedQuery = query.toLowerCase();
      const cfg = yield* Ref.get(context.config);

      const effectScore = scoreEffectSpecificity(normalizedQuery);
      const topicMatch = matchTopics(normalizedQuery);
      const guidanceScore = scoreGuidance(normalizedQuery);

      const totalScore = Math.min(
        1,
        effectScore * cfg.effectKeywordWeight +
          topicMatch.score * cfg.topicMatchWeight +
          guidanceScore * cfg.guidanceIndicatorWeight
      );

      return {
        score: totalScore,
        effectScore,
        topicScore: topicMatch.score,
        guidanceScore,
        threshold: cfg.minScoreForPatterns,
        reasons: [
          `Effect-TS score: ${(effectScore * 100).toFixed(0)}%`,
          `Topic match: ${topicMatch.topics.join(", ") || "none"} (${(topicMatch.score * 100).toFixed(0)}%)`,
          `Guidance indicators: ${(guidanceScore * 100).toFixed(0)}%`,
        ],
        suggestedTopics: topicMatch.topics,
      };
    });

  /**
   * Set minimum score threshold
   */
  const setMinimumThreshold = (
    threshold: number
  ): Effect.Effect<void, InvalidThresholdError> =>
    Effect.gen(function* () {
      if (threshold < 0 || threshold > 1) {
        return yield* Effect.fail(
          new InvalidThresholdError({
            threshold,
            message: "Threshold must be between 0 and 1",
          })
        );
      }
      yield* Ref.update(context.config, (c) => ({
        ...c,
        minScoreForPatterns: threshold,
      }));
    });

  /**
   * Get current scoring configuration
   */
  const getConfig = (): Effect.Effect<ScoringConfig, never> =>
    Ref.get(context.config);

  return {
    scoreQuery,
    getDetailedScore,
    setMinimumThreshold,
    getConfig,
  } satisfies PatternScorerServiceAPI;
});

/**
 * PatternScorerService Effect.Service implementation
 */
export class PatternScorerService extends Effect.Service<PatternScorerService>()(
  "PatternScorerService",
  {
    scoped: makePatternScorerService,
  }
) {}

