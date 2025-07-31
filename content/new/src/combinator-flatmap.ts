import { Effect, Stream, Option, Either } from "effect";

const effect = Effect.succeed(2).pipe(
  Effect.flatMap((n) => Effect.succeed(n * 10))
);

const option = Option.some(2).pipe(Option.flatMap((n) => Option.some(n * 10)));

const either = Either.right(2).pipe(
  Either.flatMap((n) => Either.right(n * 10))
);

const stream = Stream.fromIterable([1, 2]).pipe(
  Stream.flatMap((n) => Stream.fromIterable([n, n * 10]))
);

const program = Effect.gen(function* () {
  const effectResult = yield* effect;
  yield* Effect.log(`Effect.flatMap result: ${effectResult}`);
  yield* Effect.log(
    `Option.flatMap result: ${Option.isSome(option) ? option.value : "None"}`
  );
  yield* Effect.log(
    `Either.flatMap result: ${
      Either.isRight(either) ? either.right : either.left
    }`
  );
  const streamValues: number[] = [];
  yield* Stream.runForEach(stream, (n) =>
    Effect.sync(() => streamValues.push(n))
  );
  yield* Effect.log(`Stream.flatMap result: [${streamValues.join(", ")}]`);
});

Effect.runPromise(program);
