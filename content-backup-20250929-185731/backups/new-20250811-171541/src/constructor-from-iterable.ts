import { Stream, Effect } from "effect";

const numbers = [1, 2, 3, 4];
const numberStream = Stream.fromIterable(numbers);

function* gen() {
  yield "a";
  yield "b";
}
const letterStream = Stream.fromIterable(gen());

const effects = [Effect.succeed(1), Effect.succeed(2)];
const batchEffect = Effect.all(effects);

const program = Effect.gen(function* () {
  const numberValues: number[] = [];
  yield* Stream.runForEach(numberStream, (n) =>
    Effect.sync(() => numberValues.push(n))
  );
  yield* Effect.log(
    `Stream.fromIterable(numbers): [${numberValues.join(", ")}]`
  );

  const letterValues: string[] = [];
  yield* Stream.runForEach(letterStream, (l) =>
    Effect.sync(() => letterValues.push(l))
  );
  yield* Effect.log(`Stream.fromIterable(gen()): [${letterValues.join(", ")}]`);

  const batch = yield* batchEffect;
  yield* Effect.log(`Effect.all result: [${batch.join(", ")}]`);
});

Effect.runPromise(
  program.pipe(Effect.catchAll(() => Effect.succeed(undefined)))
);
