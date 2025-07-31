import { Effect } from "effect";

// This should definitely trigger a floating effect diagnostic
Effect.succeed(42);

// This should trigger a diagnostic about wrong yield usage
const wrongYield = Effect.gen(function* () {
  const result = yield Effect.succeed(42); // Missing *
  return result;
});

// This should trigger a diagnostic about unnecessary Effect.gen
const singleYield = Effect.gen(function* () {
  return yield* Effect.succeed(42);
});

// This should trigger a diagnostic about try/catch in Effect.gen
const tryCatchInGen = Effect.gen(function* () {
  try {
    return yield* Effect.succeed(42);
  } catch (error) {
    return yield* Effect.fail(new Error("Bad"));
  }
});

// This should trigger a diagnostic about multiple Effect versions

// This should trigger a diagnostic about unnecessary pipe chains
const chainedPipe = Effect.succeed(1)
  .pipe(Effect.map((n) => n + 1))
  .pipe(Effect.map((n) => n * 2))
  .pipe(Effect.map((n) => n.toString()));
