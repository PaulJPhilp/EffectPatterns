/**
 * Schema Definitions for Discord Q&A Analyzer
 *
 * This module defines all Effect.Schema types used throughout the analyzer:
 * - Discord message data structures
 * - LLM analysis output structures
 * - Validation and transformation schemas
 */

import { Schema } from 'effect';

// ============================================================================
// Discord Message Schemas
// ============================================================================

/**
 * Discord message author information
 */
export const AuthorSchema = Schema.Struct({
  /** Discord user ID */
  id: Schema.String.pipe(Schema.nonEmptyString()),
  /** Discord username */
  name: Schema.String.pipe(Schema.nonEmptyString()),
});

export type Author = Schema.Schema.Type<typeof AuthorSchema>;

/**
 * Individual Discord message with metadata
 */
export const MessageSchema = Schema.Struct({
  /** Sequential message ID for ordering */
  seqId: Schema.Number.pipe(Schema.int(), Schema.positive()),
  /** Discord message ID */
  id: Schema.String.pipe(Schema.nonEmptyString()),
  /** Message content/text */
  content: Schema.String.pipe(Schema.nonEmptyString()),
  author: AuthorSchema,
  /** ISO 8601 timestamp */
  timestamp: Schema.String,
});

export type Message = Schema.Schema.Type<typeof MessageSchema>;

/**
 * Collection of Discord messages (top-level structure from JSON file)
 */
export const MessageCollectionSchema = Schema.Struct({
  /** Array of Discord messages */
  messages: Schema.Array(MessageSchema).pipe(Schema.minItems(1)),
});

export type MessageCollection = Schema.Schema.Type<
  typeof MessageCollectionSchema
>;

// ============================================================================
// Analysis Output Schemas
// ============================================================================

/**
 * Effect pattern identified in the analysis
 */
export const EffectPatternSchema = Schema.Struct({
  /** Pattern name (e.g., 'Service', 'Layer', 'Error Handling') */
  pattern: Schema.String.pipe(Schema.nonEmptyString()),
  /** Description of how the pattern is used */
  description: Schema.String.pipe(Schema.nonEmptyString()),
  /** Message IDs that demonstrate this pattern */
  exampleMessageIds: Schema.Array(Schema.String),
});

export type EffectPattern = Schema.Schema.Type<typeof EffectPatternSchema>;

/**
 * Code example extracted from messages
 */
export const CodeExampleSchema = Schema.Struct({
  /** Pattern or concept demonstrated */
  pattern: Schema.String.pipe(Schema.nonEmptyString()),
  /** Code snippet */
  code: Schema.String.pipe(Schema.nonEmptyString()),
  /** Explanation or context for the code */
  context: Schema.String.pipe(Schema.nonEmptyString()),
});

export type CodeExample = Schema.Schema.Type<typeof CodeExampleSchema>;

/**
 * Partial analysis result from a single chunk
 *
 * This schema defines the structured output we expect from the LLM
 * when analyzing a chunk of messages. It ensures type-safe aggregation.
 */
export const PartialAnalysisSchema = Schema.Struct({
  /** ID of the chunk being analyzed */
  chunkId: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  /** Number of messages in this chunk */
  messageCount: Schema.Number.pipe(Schema.int(), Schema.positive()),
  /** Questions being asked by developers */
  commonQuestions: Schema.Array(Schema.String),
  /** Effect-TS patterns discussed in this chunk */
  effectPatterns: Schema.Array(EffectPatternSchema),
  /** Concepts or issues causing confusion */
  painPoints: Schema.Array(Schema.String),
  /** Recommended solutions and best practices */
  bestPractices: Schema.Array(Schema.String),
  /** Code examples demonstrating patterns */
  codeExamples: Schema.Array(CodeExampleSchema),
});

export type PartialAnalysis = Schema.Schema.Type<typeof PartialAnalysisSchema>;

/**
 * Complete analysis aggregated from all chunks
 */
export const FinalAnalysisSchema = Schema.Struct({
  /** Total number of chunks analyzed */
  totalChunks: Schema.Number.pipe(Schema.int(), Schema.positive()),
  /** Total number of messages analyzed */
  totalMessages: Schema.Number.pipe(Schema.int(), Schema.positive()),
  /** Individual chunk analyses */
  partialAnalyses: Schema.Array(PartialAnalysisSchema),
  /** Aggregated markdown report */
  finalReport: Schema.String.pipe(Schema.nonEmptyString()),
});

export type FinalAnalysis = Schema.Schema.Type<typeof FinalAnalysisSchema>;

// ============================================================================
// Helper Schemas for Validation
// ============================================================================

/**
 * Schema for validating minimum message count
 */
export const MinimumMessagesSchema = (min: number) =>
  Schema.Array(MessageSchema).pipe(Schema.minItems(min));

/**
 * Schema for validating a chunk of messages
 */
export const MessageChunkSchema = Schema.Array(MessageSchema).pipe(
  Schema.minItems(1),
);

export type MessageChunk = Schema.Schema.Type<typeof MessageChunkSchema>;

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Decode and validate a MessageCollection from unknown data
 */
export const decodeMessageCollection = Schema.decode(MessageCollectionSchema);

/**
 * Decode and validate a PartialAnalysis from unknown data
 */
export const decodePartialAnalysis = Schema.decode(PartialAnalysisSchema);

/**
 * Encode a PartialAnalysis to JSON-compatible format
 */
export const encodePartialAnalysis = Schema.encode(PartialAnalysisSchema);
