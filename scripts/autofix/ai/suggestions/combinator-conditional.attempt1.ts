import { Effect, Stream, Option, Either } from "effect";

// Effect: Branch based on a condition
const effect = Effect.if(true, {
  onTrue: () => Effect.succeed("yes"),
  onFalse: () => Effect.succeed("no"),
}); // Effect<string>

// Option: Conditionally create an Option
const option = Option.some(true ? "yes" : "no");
// Option<string> (Some("yes"))

// Either: Conditionally create an Either
const either = true
  ? Either.right("yes")
  : Either.left("error");
// Either<string, string> (Right("yes"))

// Stream: Conditionally emit a stream
const stream = false
  ? Stream.fromIterable([1, 2])
  : Stream.empty();
// Stream<number> (empty)
