import { Effect, Stream, Option, Either } from "effect";

// Effect: Transform the result of an effect
const effect = Effect.succeed(2).pipe(
  Effect.map((n) => n * 10)
); // Effect<number>

// Option: Transform an optional value
const option = Option.some(2).pipe(
  Option.map((n) => n * 10)
); // Option<number>

// Either: Transform a value that may be an error
const either = Either.right(2).pipe(
  Either.map((n) => n * 10)
); // Either<never, number>

// Stream: Transform every value in a stream
const stream = Stream.fromIterable([1, 2, 3]).pipe(
  Stream.map((n) => n * 10)
); // Stream<number>