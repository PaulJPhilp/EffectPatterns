import { Effect, Option, Either } from "effect";

const effect = Effect.fail("Oops!").pipe(
  Effect.match({
    onFailure: (err) => `Error: ${err}`,
    onSuccess: (value) => `Success: ${value}`,
  })
);

const option = Option.some(42).pipe(
  Option.match({
    onNone: () => "No value",
    onSome: (n) => `Value: ${n}`,
  })
);

const either = Either.left("fail").pipe(
  Either.match({
    onLeft: (err) => `Error: ${err}`,
    onRight: (value) => `Value: ${value}`,
  })
);

const program = Effect.gen(function* () {
  const effectResult = yield* effect;
  yield* Effect.log(`Effect.match result: ${effectResult}`);
  yield* Effect.log(`Option.match result: ${option}`);
  yield* Effect.log(`Either.match result: ${either}`);
});

Effect.runPromise(program);
