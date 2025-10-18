/**
 * Generate Request/Response Schema Definitions
 *
 * Schemas for the code generation API endpoints, including request
 * validation and response format.
 */

import { Schema as S } from "@effect/schema";

/**
 * Module type for generated code
 */
export const ModuleType = S.Literal("esm", "cjs");

export type ModuleType = S.Schema.Type<typeof ModuleType>;

/**
 * Generate snippet request
 */
export const GenerateRequest = S.Struct({
  patternId: S.String,
  name: S.optional(S.String),
  input: S.optional(S.String),
  moduleType: S.optional(ModuleType),
  effectVersion: S.optional(S.String),
});

export type GenerateRequest = S.Schema.Type<typeof GenerateRequest>;

/**
 * Generate snippet response
 */
export const GenerateResponse = S.Struct({
  patternId: S.String,
  title: S.String,
  snippet: S.String,
  traceId: S.optional(S.String),
  timestamp: S.String,
});

export type GenerateResponse = S.Schema.Type<typeof GenerateResponse>;

/**
 * Search patterns request (query params)
 */
export const SearchPatternsRequest = S.Struct({
  q: S.optional(S.String),
  category: S.optional(S.String),
  difficulty: S.optional(S.String),
  limit: S.optional(S.NumberFromString),
});

export type SearchPatternsRequest = S.Schema.Type<
  typeof SearchPatternsRequest
>;

/**
 * Search patterns response
 */
export const SearchPatternsResponse = S.Struct({
  count: S.Number,
  patterns: S.Array(
    S.Struct({
      id: S.String,
      title: S.String,
      description: S.String,
      category: S.String,
      difficulty: S.String,
      tags: S.Array(S.String),
    })
  ),
  traceId: S.optional(S.String),
});

export type SearchPatternsResponse = S.Schema.Type<
  typeof SearchPatternsResponse
>;
