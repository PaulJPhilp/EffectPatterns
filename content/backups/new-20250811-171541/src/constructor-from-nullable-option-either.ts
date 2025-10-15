import { Effect, Either, Option } from 'effect';

const nullableValue: string | null = Math.random() > 0.5 ? 'hello' : null;
const effect = Effect.fromNullable(nullableValue).pipe(
  Effect.orElse(() => Effect.fail('Value was null'))
);

const option = Option.some(42);
const effectFromOption = Option.match(option, {
  onNone: () => Effect.fail('No value'),
  onSome: (n) => Effect.succeed(n),
});

const either = Either.right('success');
const effectFromEither = Either.match(either, {
  onLeft: (e) => Effect.fail(e),
  onRight: (a) => Effect.succeed(a),
});

const program = Effect.gen(function* () {
  yield* Effect.either(effect).pipe(
    Effect.tap((res) =>
      Effect.log(
        `Effect.fromNullable result: ${
          res._tag === 'Left' ? `Error: ${res.left}` : res.right
        }`
      )
    )
  );
  yield* Effect.either(effectFromOption).pipe(
    Effect.tap((res) =>
      Effect.log(
        `Effect.fromOption result: ${
          res._tag === 'Left' ? `Error: ${res.left}` : res.right
        }`
      )
    )
  );
  yield* Effect.either(effectFromEither).pipe(
    Effect.tap((res) =>
      Effect.log(
        `Effect.fromEither result: ${
          res._tag === 'Left' ? `Error: ${res.left}` : res.right
        }`
      )
    )
  );
});

Effect.runPromise(
  program.pipe(Effect.catchAll(() => Effect.succeed(undefined)))
);
