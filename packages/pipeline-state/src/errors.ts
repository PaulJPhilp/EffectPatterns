import { Data } from "effect";

/**
 * State machine errors
 */

export class InvalidTransitionError extends Data.TaggedError(
  "InvalidTransitionError"
)<{
  readonly patternId: string;
  readonly fromStep: string;
  readonly toStep: string;
  readonly reason: string;
}> {}

export class StateFileNotFoundError extends Data.TaggedError(
  "StateFileNotFoundError"
)<{
  readonly filePath: string;
  readonly reason: string;
}> {}

export class PatternNotFoundError extends Data.TaggedError(
  "PatternNotFoundError"
)<{
  readonly patternId: string;
  readonly reason: string;
}> {}

export class StateFilePersistenceError extends Data.TaggedError(
  "StateFilePersistenceError"
)<{
  readonly filePath: string;
  readonly operation: "read" | "write";
  readonly reason: string;
}> {}

export class InvalidStateError extends Data.TaggedError("InvalidStateError")<{
  readonly patternId: string;
  readonly issue: string;
  readonly reason: string;
}> {}

export class StepAlreadyCompletedError extends Data.TaggedError(
  "StepAlreadyCompletedError"
)<{
  readonly patternId: string;
  readonly step: string;
  readonly completedAt: string;
  readonly reason: string;
}> {}

export class CannotRetryError extends Data.TaggedError("CannotRetryError")<{
  readonly patternId: string;
  readonly step: string;
  readonly reason: string;
}> {}

export type StateError =
  | InvalidTransitionError
  | StateFileNotFoundError
  | PatternNotFoundError
  | StateFilePersistenceError
  | InvalidStateError
  | StepAlreadyCompletedError
  | CannotRetryError;
