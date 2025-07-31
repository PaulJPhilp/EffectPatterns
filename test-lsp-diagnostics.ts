import { Effect } from "effect";

// This should trigger a floating effect diagnostic
Effect.succeed(42);

// This should trigger a diagnostic about unnecessary Effect.gen
const unnecessaryGen = Effect.gen(function* () {
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

// This should trigger a diagnostic about unnecessary pipe chains
const chainedPipe = Effect.succeed(1)
  .pipe(Effect.map((n) => n + 1))
  .pipe(Effect.map((n) => n * 2))
  .pipe(Effect.map((n) => n.toString()));

// This should work fine
const goodEffect = Effect.gen(function* () {
  const a = yield* Effect.succeed(1);
  const b = yield* Effect.succeed(2);
  return a + b;
});

// This should trigger a diagnostic about wrong yield usage
const wrongYield = Effect.gen(function* () {
  const result = yield Effect.succeed(42); // Missing *
  return result;
});
