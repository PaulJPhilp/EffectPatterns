import { Stream, Effect } from "effect";

// Stream: Create a stream from an array
const numbers = [1, 2, 3, 4];
const numberStream = Stream.fromIterable(numbers); // Stream<number>

// Stream: Create a stream from any iterable
function* gen() {
  yield "a";
  yield "b";
}
const letterStream = Stream.fromIterable(gen()); // Stream<string>

// Effect: Create an effect from an array of effects (batch)
const effects = [Effect.succeed(1), Effect.succeed(2)];
const batchEffect = Effect.all(effects, { concurrency: "unbounded" }); // Effect<[1, 2]>