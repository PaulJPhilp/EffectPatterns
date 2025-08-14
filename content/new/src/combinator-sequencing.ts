import { Effect, Stream, Option, Either } from "effect";

// andThen: Run one effect, then another, ignore the first result
const logThenCompute = Effect.log("Starting...").pipe(
  Effect.andThen(Effect.succeed(42))
); // Effect<number>

// tap: Log the result of an effect, but keep the value
const computeAndLog = Effect.succeed(42).pipe(
  Effect.tap((n) => Effect.log(`Result is ${n}`))
); // Effect<number>

// flatten: Remove one level of nesting
const nestedOption = Option.some(Option.some(1));
const flatOption = Option.flatten(nestedOption); // Option<number>

const nestedEffect = Effect.succeed(Effect.succeed(1));
const flatEffect = Effect.flatten(nestedEffect); // Effect<number>

// tapError: Log errors without handling them
const mightFail = Effect.fail("fail!").pipe(
  Effect.tapError((err) => Effect.logError(`Error: ${err}`))
); // Effect<never>

// Stream: tap for side effects on each element
const stream = Stream.fromIterable([1, 2, 3]).pipe(
  Stream.tap((n) => Effect.log(`Saw: ${n}`))
); // Stream<number>