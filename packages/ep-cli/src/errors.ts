/**
 * Tagged error types for ep-cli
 */

import { Data } from "effect";

export class UnsupportedToolError extends Data.TaggedError("UnsupportedToolError")<{
  readonly tool: string;
  readonly supported: readonly string[];
}> {}

export class ValidationFailedError extends Data.TaggedError("ValidationFailedError")<{
  readonly message: string;
  readonly errorCount: number;
}> {}

export class PatternNotFoundError extends Data.TaggedError("PatternNotFoundError")<{
  readonly patternId: string;
}> {}
