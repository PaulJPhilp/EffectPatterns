/**
 * Tagged error types for ep-cli
 */

import { Data } from "effect";

export class LintFailedError extends Data.TaggedError("LintFailedError")<{
  readonly message: string;
}> {}

export class UnsupportedToolError extends Data.TaggedError("UnsupportedToolError")<{
  readonly tool: string;
  readonly supported: readonly string[];
}> {}

export class RuleNotFoundError extends Data.TaggedError("RuleNotFoundError")<{
  readonly ruleId: string;
}> {}

export class DisabledFeatureError extends Data.TaggedError("DisabledFeatureError")<{
  readonly feature: string;
  readonly reason: string;
}> {}

export class ValidationFailedError extends Data.TaggedError("ValidationFailedError")<{
  readonly message: string;
  readonly errorCount: number;
}> {}
