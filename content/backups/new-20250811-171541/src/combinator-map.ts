import { Effect, Stream, Option, Either } from "effect";

const effect = Effect.succeed(2).pipe(Effect.map((n) => n * 10));

const option = Option.some(2).pipe(Option.map((n) => n * 10));

const either = Either.right(2).pipe(Either.map((n) => n * 10));

const stream = Stream.fromIterable([1, 2, 3]).pipe(Stream.map((n) => n * 10));

const program = Effect.gen(function* () {
  const effectResult = yield* effect;
  yield* Effect.log(`Effect.map result: ${effectResult}`);
  yield* Effect.log(
    `Option.map result: ${Option.isSome(option) ? option.value : "None"}`
  );
  yield* Effect.log(
    `Either.map result: ${Either.isRight(either) ? either.right : either.left}`
  );
  const streamValues: number[] = [];
  yield* Stream.runForEach(stream, (n) =>
    Effect.sync(() => streamValues.push(n))
  );
  yield* Effect.log(`Stream.map result: [${streamValues.join(", ")}]`);
});

Effect.runPromise(program);
