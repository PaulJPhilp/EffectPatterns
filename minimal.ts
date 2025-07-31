import { Effect } from "effect";

const program = Effect.gen(function* () {
  yield* Effect.log("hello");
});

Effect.runPromise(program);
