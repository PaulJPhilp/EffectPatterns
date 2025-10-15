import { Effect, Either, Option, Stream } from 'effect';

const effect = Effect.succeed(4).pipe(
  Effect.filterOrFail(
    (n) => n % 2 === 0,
    () => 'Filtered out (fail)'
  )
);

const option = Option.some(4).pipe(Option.filter((n) => n % 2 === 0));

const either = (() => {
  const e = Either.right(4);
  return Either.isRight(e) && e.right % 2 === 0
    ? e
    : Either.left('filtered out');
})();

const stream = Stream.fromIterable([1, 2, 3, 4]).pipe(
  Stream.filter((n: number) => n % 2 === 0)
);

const program = Effect.gen(function* () {
  const effectResult = yield* Effect.either(effect);
  yield* Effect.log(
    `Effect.filter result: ${
      effectResult._tag === 'Right' ? effectResult.right : effectResult.left
    }`
  );
  yield* Effect.log(
    `Option.filter result: ${
      Option.isSome(option) ? option.value : 'Filtered out (none)'
    }`
  );
  yield* Effect.log(
    `Either.filter result: ${
      Either.isRight(either) ? either.right : 'Filtered out (left)'
    }`
  );
  const streamValues: number[] = [];
  yield* Stream.runForEach(stream, (n) =>
    Effect.sync(() => streamValues.push(n))
  );
  yield* Effect.log(`Stream.filter result: [${streamValues.join(', ')}]`);
});

Effect.runPromise(program);
