import { Effect, Exit } from "effect";

const program = Effect.gen(function* () {
  const exit = yield* Effect.promise(() =>
    Effect.runPromiseExit(Effect.succeed(42))
  );
  if (Exit.isSuccess(exit)) {
    yield* Effect.log(`Success: ${exit.value}`);
  } else if (Exit.isFailure(exit)) {
    yield* Effect.log(`Failure: ${JSON.stringify(exit.cause)}`);
  }
});

Effect.runPromise(program);
