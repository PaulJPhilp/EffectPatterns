import { Effect, Stream, Option, Either } from "effect";

const effect = Effect.if(true, {
  onTrue: () => Effect.succeed("yes"),
  onFalse: () => Effect.succeed("no"),
});

const option = true ? Option.some("yes") : Option.none();

const either = true ? Either.right("yes") : Either.left("error");

const stream: Stream.Stream<number> = false
  ? Stream.fromIterable([1, 2])
  : Stream.empty;

const program = Effect.gen(function* () {
  const result = yield* effect;
  yield* Effect.log(`Effect.if result: ${result}`);
  yield* Effect.log(
    `Option result: ${Option.isSome(option) ? option.value : "None"}`
  );
  yield* Effect.log(
    `Either result: ${Either.isRight(either) ? either.right : either.left}`
  );
  const streamValues: number[] = [];
  yield* Stream.runForEach(stream, (n) =>
    Effect.sync(() => streamValues.push(n))
  );
  yield* Effect.log(`Stream result: [${streamValues.join(", ")}]`);
});

Effect.runPromise(program);
