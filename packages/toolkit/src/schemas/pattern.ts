/**
 * Pattern Schema Definitions using @effect/schema
 *
 * Canonical domain types for Effect patterns, including full Pattern
 * representation and PatternSummary for list views.
 */

import { Schema as S } from '@effect/schema';

/**
 * Pattern category enumeration
 */
export const PatternCategory = S.Literal(
  'error-handling',
  'concurrency',
  'data-transformation',
  'testing',
  'services',
  'streams',
  'caching',
  'observability',
  'scheduling',
  'resource-management',
);

export type PatternCategory = S.Schema.Type<typeof PatternCategory>;

/**
 * Pattern difficulty level
 */
export const DifficultyLevel = S.Literal(
  'beginner',
  'intermediate',
  'advanced',
);

export type DifficultyLevel = S.Schema.Type<typeof DifficultyLevel>;

/**
 * Code example schema
 */
export const CodeExample = S.Struct({
  language: S.String,
  code: S.String,
  description: S.optional(S.String),
});

export type CodeExample = S.Schema.Type<typeof CodeExample>;

/**
 * Full Pattern schema with all metadata and content
 */
export const Pattern = S.Struct({
  id: S.String,
  title: S.String,
  description: S.String,
  category: PatternCategory,
  difficulty: DifficultyLevel,
  tags: S.Array(S.String),
  examples: S.Array(CodeExample),
  useCases: S.Array(S.String),
  relatedPatterns: S.optional(S.Array(S.String)),
  effectVersion: S.optional(S.String),
  createdAt: S.optional(S.String),
  updatedAt: S.optional(S.String),
});

export type Pattern = S.Schema.Type<typeof Pattern>;

/**
 * Pattern summary for list views (lighter weight)
 */
export const PatternSummary = S.Struct({
  id: S.String,
  title: S.String,
  description: S.String,
  category: PatternCategory,
  difficulty: DifficultyLevel,
  tags: S.Array(S.String),
});

export type PatternSummary = S.Schema.Type<typeof PatternSummary>;

/**
 * Patterns index (loaded from patterns.json)
 */
export const PatternsIndex = S.Struct({
  version: S.optional(S.String),
  patterns: S.Array(Pattern),
  lastUpdated: S.optional(S.String),
});

export type PatternsIndex = S.Schema.Type<typeof PatternsIndex>;
