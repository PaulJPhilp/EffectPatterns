import { Effect } from "effect";

// This should trigger a floating effect diagnostic from the Effect LSP
Effect.succeed(1);

// This should be fine
const effect = Effect.succeed(1);

// This should also trigger a diagnostic
Effect.gen(function* () {
  yield* Effect.succeed(1); // Missing yield* for Effect
});

export {};
