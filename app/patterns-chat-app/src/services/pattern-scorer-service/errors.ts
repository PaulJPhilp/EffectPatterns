import { Data } from "effect";

/**
 * PatternScorerService Errors
 * Tagged error types for the pattern scorer service
 */

export class PatternScorerError extends Data.TaggedError(
  "PatternScorerError"
)<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export class InvalidThresholdError extends Data.TaggedError(
  "InvalidThresholdError"
)<{
  readonly threshold: number;
  readonly message: string;
}> {}

export class QueryValidationError extends Data.TaggedError(
  "QueryValidationError"
)<{
  readonly query: string;
  readonly message: string;
}> {}

