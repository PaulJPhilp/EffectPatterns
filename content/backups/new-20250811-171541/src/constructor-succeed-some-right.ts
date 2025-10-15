import { Effect, Either, Option } from 'effect';

const effect = Effect.succeed(42);
const option = Option.some('hello');
const either = Either.right({ id: 1 });

const program = Effect.gen(function* () {
  const effectResult = yield* effect;
  yield* Effect.log(`Effect.succeed result: ${effectResult}`);
  yield* Effect.log(
    `Option.some result: ${Option.isSome(option) ? option.value : 'None'}`
  );
  yield* Effect.log(
    `Either.right result: ${
      Either.isRight(either) ? JSON.stringify(either.right) : either.left
    }`
  );
});

Effect.runPromise(program);
