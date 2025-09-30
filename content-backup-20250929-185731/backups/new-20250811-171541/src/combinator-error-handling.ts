import { Effect, Option, Either } from "effect";

const effect = Effect.fail("fail!").pipe(
  Effect.catchAll((err) => Effect.succeed(`Recovered from: ${err}`))
);

const option = Option.none().pipe(Option.orElse(() => Option.some("default")));

const either = Either.left("error").pipe(
  Either.orElse(() => Either.right("fallback"))
);

const matchEffect = Effect.fail("fail!").pipe(
  Effect.match({
    onFailure: (err) => `Error: ${err}`,
    onSuccess: (value) => `Success: ${value}`,
  })
);

const program = Effect.gen(function* () {
  const effectResult = yield* effect;
  yield* Effect.log(`Effect.catchAll result: ${effectResult}`);
  yield* Effect.log(
    `Option.orElse result: ${Option.isSome(option) ? option.value : "None"}`
  );
  yield* Effect.log(
    `Either.orElse result: ${
      Either.isRight(either) ? either.right : either.left
    }`
  );
  const matchResult = yield* matchEffect;
  yield* Effect.log(`Effect.match result: ${matchResult}`);
});

Effect.runPromise(program);
