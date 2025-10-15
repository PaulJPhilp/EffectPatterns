import { Effect, Either, Option, Stream } from 'effect';

const effectA = Effect.succeed(1);
const effectB = Effect.succeed('hello');
const zippedEffect = effectA.pipe(Effect.zip(effectB));

const optionA = Option.some(1);
const optionB = Option.some('hello');
const zippedOption = Option.zipWith(
  optionA,
  optionB,
  (a, b) => [a, b] as const
);

const eitherA = Either.right(1);
const eitherB = Either.right('hello');
const zippedEither = Either.zipWith(
  eitherA,
  eitherB,
  (a, b) => [a, b] as const
);

const streamA = Stream.fromIterable([1, 2, 3]);
const streamB = Stream.fromIterable(['a', 'b', 'c']);
const zippedStream = streamA.pipe(Stream.zip(streamB));

const program = Effect.gen(function* () {
  const effectResult = yield* zippedEffect;
  yield* Effect.log(
    `Effect.zip result: [${effectResult[0]}, ${effectResult[1]}]`
  );
  yield* Effect.log(
    `Option.zip result: ${
      Option.isSome(zippedOption)
        ? `[${zippedOption.value[0]}, ${zippedOption.value[1]}]`
        : 'None'
    }`
  );
  yield* Effect.log(
    `Either.zip result: ${
      Either.isRight(zippedEither)
        ? `[${zippedEither.right[0]}, ${zippedEither.right[1]}]`
        : 'Left'
    }`
  );
  const streamValues: Array<[number, string]> = [];
  yield* Stream.runForEach(zippedStream, (pair) =>
    Effect.sync(() => streamValues.push(pair))
  );
  yield* Effect.log(
    `Stream.zip result: [${streamValues
      .map(([n, s]) => `[${n}, ${s}]`)
      .join(', ')}]`
  );
});

Effect.runPromise(
  program.pipe(Effect.catchAll(() => Effect.succeed(undefined)))
);
