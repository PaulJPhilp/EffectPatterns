import { Effect, Stream, Option, Either } from "effect";

// Effect: Only succeed if the value is even
// Note: Effect.filter returns Effect<Option<A>>
const effect = Effect.succeed(4).pipe(
  Effect.filter((n) => n % 2 === 0)
); // Effect<Option<number>>

// Option: Only keep the value if it is even
const option = Option.some(4).pipe(
  Option.filter((n) => n % 2 === 0)
); // Option<number>

// Either: Only keep the value if it is even,
// otherwise convert Right to Left with an error.
// Note: Either.filter does not exist. Use Either.filterOrElse.
const either = Either.right(4).pipe(
  Either.filterOrElse((n) => n % 2 === 0, () => "Value is not even")
); // Either<string, number>

// Stream: Only emit even numbers
const stream = Stream.fromIterable([1, 2, 3, 4]).pipe(
  Stream.filter((n) => n % 2 === 0)
); // Stream<number>
