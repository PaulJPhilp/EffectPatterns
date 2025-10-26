import { Effect, Either, Option, Stream } from "effect";

// Effect: Combine two effects and get both results
const effectA = Effect.succeed(1);
const effectB = Effect.succeed("hello");
const zippedEffect = effectA.pipe(
  Effect.zip(effectB)
); // Effect<[number, string]>

// Option: Combine two options, only Some if both are Some
const optionA = Option.some(1);
const optionB = Option.some("hello");
const zippedOption = Option.all([optionA, optionB]); // Option<[number, string]>

// Either: Combine two eithers, only Right if both are Right
const eitherA = Either.right(1);
const eitherB = Either.right("hello");
const zippedEither = Either.all([eitherA, eitherB]); // Either<never, [number, string]>

// Stream: Pair up values from two streams
const streamA = Stream.fromIterable([1, 2, 3]);
const streamB = Stream.fromIterable(["a", "b", "c"]);
const zippedStream = streamA.pipe(
  Stream.zip(streamB)
); // Stream<[number, string]>