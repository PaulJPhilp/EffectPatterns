import { Data } from "effect";

export class NoActiveRunError extends Data.TaggedError("NoActiveRunError")<{
  reason: string;
}> {}

