import { Schema } from "effect";

/**
 * PatternScorerService Schemas
 * Effect.Schema validation schemas for scoring results and configuration
 */

export const ScoringResultSchema = Schema.Struct({
  needsPatterns: Schema.Boolean,
  score: Schema.Number,
  reasons: Schema.Array(Schema.String),
  suggestedTopics: Schema.optional(Schema.Array(Schema.String)),
});

export const DetailedScoringResultSchema = Schema.Struct({
  score: Schema.Number,
  effectScore: Schema.Number,
  topicScore: Schema.Number,
  guidanceScore: Schema.Number,
  threshold: Schema.Number,
  reasons: Schema.Array(Schema.String),
  suggestedTopics: Schema.optional(Schema.Array(Schema.String)),
});

export const ScoringConfigSchema = Schema.Struct({
  minScoreForPatterns: Schema.Number,
  effectKeywordWeight: Schema.Number,
  topicMatchWeight: Schema.Number,
  guidanceIndicatorWeight: Schema.Number,
});

