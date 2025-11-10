import { Schema } from "effect";

/**
 * SupermemoryService Schemas
 * Effect.Schema validation schemas for API responses
 */

export const ProcessingDocumentSchema = Schema.Struct({
  id: Schema.String,
  status: Schema.Union(
    Schema.Literal("processing"),
    Schema.Literal("done"),
    Schema.Literal("failed")
  ),
  progress: Schema.optional(Schema.Number),
});

export const ProcessingQueueSchema = Schema.Struct({
  queue: Schema.Array(ProcessingDocumentSchema),
  totalCount: Schema.Number,
});

export const UserProfileSchema = Schema.Struct({
  userId: Schema.String,
  static: Schema.Array(Schema.String),
  dynamic: Schema.Array(Schema.String),
  retrievedAt: Schema.String,
});

export const ProfileStatsSchema = Schema.Struct({
  container: Schema.String,
  totalUsers: Schema.Number,
  avgStaticFacts: Schema.Number,
  avgDynamicFacts: Schema.Number,
  maxStaticFacts: Schema.Number,
  maxDynamicFacts: Schema.Number,
  commonTopics: Schema.Record({
    key: Schema.String,
    value: Schema.Any,
  }),
  retrievedAt: Schema.String,
});
