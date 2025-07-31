import { Effect } from "effect";

// This should trigger a floating effect diagnostic
Effect.succeed(1);

// This should trigger an unnecessary gen diagnostic
Effect.gen(function* () {
  const value = yield* Effect.succeed(1);
  return value;
});

// This should be fine
const goodEffect = Effect.succeed(1);

export {};
