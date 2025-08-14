import { Effect, Stream, Option, Either, Data } from "effect";

// Define a custom error for odd numbers
class OddNumberError extends Data.TaggedError("OddNumberError") {}

// Effect: Only succeed if the value is even, otherwise fail
const effect = Effect.succeed(4).pipe(
  Effect.filterOrFail(
    (n) => n % 2 === 0,
    () => new OddNumberError()
  )
); // Effect<number, OddNumberError>

// Option: Only keep the value if it is even
const option = Option.some(4).pipe(
  Option.filter((n) => n % 2 === 0)
); // Option<number>

// Either: Only keep the value if it is even, otherwise turn into Left
const either = Either.right(4).pipe(
  Either.filterOrElse(
    (n) => n % 2 === 0,
    () => "Value is odd"
  )
); // Either<string, number>

// Stream: Only emit even numbers
const stream = Stream.fromIterable([1, 2, 3, 4]).pipe(
  Stream.filter((n) => n % 2 === 0)
); // Stream<number>
