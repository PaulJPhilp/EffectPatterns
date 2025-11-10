import { Schema } from "effect";

/**
 * PatternsService Schemas
 * Effect.Schema validation schemas for patterns and API responses
 */

const SkillLevel = Schema.Union(
  Schema.Literal("beginner"),
  Schema.Literal("intermediate"),
  Schema.Literal("advanced")
);

export const PatternSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  description: Schema.String,
  content: Schema.String,
  skillLevel: SkillLevel,
  tags: Schema.Array(Schema.String),
  useCase: Schema.optional(Schema.Array(Schema.String)),
  relevanceScore: Schema.optional(Schema.Number),
  source: Schema.optional(Schema.Literal("supermemory")),
  url: Schema.optional(Schema.String),
});

export const PatternSearchResultSchema = Schema.Struct({
  patterns: Schema.Array(PatternSchema),
  totalCount: Schema.Number,
  query: Schema.String,
  timestamp: Schema.Number,
});

export const MemoryRouterResponseSchema = Schema.Struct({
  memories: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      content: Schema.String,
      metadata: Schema.optional(Schema.Record({
        key: Schema.String,
        value: Schema.Unknown,
      })),
      relevanceScore: Schema.optional(Schema.Number),
    })
  ),
  totalCount: Schema.Number,
  processedAt: Schema.String,
});

