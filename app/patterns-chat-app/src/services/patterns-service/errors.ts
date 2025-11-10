import { Data } from "effect";

/**
 * PatternsService Errors
 * Tagged error types for the patterns service
 */

export class PatternsServiceError extends Data.TaggedError(
  "PatternsServiceError"
)<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export class PatternNotFoundError extends Data.TaggedError(
  "PatternNotFoundError"
)<{
  readonly patternId: string;
}> {}

export class PatternSearchError extends Data.TaggedError("PatternSearchError")<{
  readonly query: string;
  readonly cause?: unknown;
}> {}

export class MemoryRouterError extends Data.TaggedError("MemoryRouterError")<{
  readonly message: string;
  readonly statusCode?: number;
  readonly cause?: unknown;
}> {}

export class CacheError extends Data.TaggedError("CacheError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}
