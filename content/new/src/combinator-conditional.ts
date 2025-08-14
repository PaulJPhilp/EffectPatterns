import { Effect, Stream, Option, Either } from "effect";

// Effect: Branch based on a condition
const effect = Effect.if(
  true,
  { onTrue: Effect.succeed("yes"), onFalse: Effect.succeed("no") }
); // Effect<string>

// Option: Conditionally create an Option
const option = Option.cond(
  true,
  { onTrue: () => "yes", onFalse: () => "no" }
); // Option<string> (Some("yes"))

// Either: Conditionally create an Either
const either = Either.cond(
  true,
  { onTrue: () => "yes", onFalse: () => "error" }
); // Either<never, string> (Right("yes"))

// Stream: Conditionally emit a stream
const stream = Stream.if(
  false,
  { onTrue: Stream.fromIterable([1, 2]), onFalse: Stream.empty() }
); // Stream<number> (empty)