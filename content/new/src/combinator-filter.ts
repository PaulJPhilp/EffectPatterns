import { Effect, Stream, Option, Either } from "effect";

// Effect: Only succeed if the value is even
const effect = Effect.succeed(4).pipe(
  Effect.filter((n) => n % 2 === 0)
); // Effect<number>

// Option: Only keep the value if it is even
const option = Option.some(4).pipe(
  Option.filter((n) => n % 2 === 0)
); // Option<number>

// Either: Only keep the value if it is even
const either = Either.right(4).pipe(
  Either.filter((n) => n % 2 === 0)
); // Either<never, number>

// Stream: Only emit even numbers
const stream = Stream.fromIterable([1, 2, 3, 4]).pipe(
  Stream.filter((n) => n % 2 === 0)
); // Stream<number>