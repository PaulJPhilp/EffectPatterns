import { Effect } from "effect";

Effect.runSync(Effect.log("1. Defining the Effect blueprint..."));

const program = Effect.gen(function* () {
  yield* Effect.log("3. The blueprint is now being executed!");
  return 42;
});

const demonstrationProgram = Effect.gen(function* () {
  yield* Effect.log("2. The blueprint has been defined. No work has been done yet.");
  yield* program;
});

Effect.runSync(demonstrationProgram);