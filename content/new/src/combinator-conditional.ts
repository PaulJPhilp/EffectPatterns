import { Effect, Stream, Option, Either } from "effect";

// Effect: Branch based on a condition
const effect = Effect.if(true, {
  onTrue: Effect.succeed("yes"),
  onFalse: Effect.succeed("no"),
}); // Effect<string>

// Option: Conditionally create an Option
const option = true ? Option.some("yes") : Option.none(); // Option<string> (Some("yes"))

// Either: Conditionally create an Either
const either = true ? Either.right("yes") : Either.left("error"); // Either<string, string> (Right("yes"))

// Stream: Conditionally emit a stream
const stream = Stream.if(false, {
  onTrue: Stream.fromIterable([1, 2]),
  onFalse: Stream.empty(),
}); // Stream<number> (empty)