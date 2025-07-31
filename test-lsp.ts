import { Effect } from "effect";

// This should trigger Effect LSP diagnostics for floating effect
const floatingEffect = Effect.succeed(42);

// This should work fine
const properEffect = Effect.gen(function* () {
  const result = yield* Effect.succeed(42);
  return result;
});

// This should trigger a warning about unnecessary Effect.gen
const unnecessaryGen = Effect.gen(function* () {
  return yield* Effect.succeed(42);
});

// This should work fine
const goodEffect = Effect.gen(function* () {
  const a = yield* Effect.succeed(1);
  const b = yield* Effect.succeed(2);
  return a + b;
});

// This should trigger a warning about try/catch inside Effect.gen
const badTryCatch = Effect.gen(function* () {
  try {
    const result = yield* Effect.succeed(42);
    return result;
  } catch (error) {
    return yield* Effect.fail(new Error("Bad practice"));
  }
});

// This should trigger a warning about unnecessary pipe chains
const unnecessaryPipe = Effect.succeed(1)
  .pipe(Effect.map((n) => n + 1))
  .pipe(Effect.map((n) => n * 2));
