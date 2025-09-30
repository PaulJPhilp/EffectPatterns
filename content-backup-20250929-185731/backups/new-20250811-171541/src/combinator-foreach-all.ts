import { Effect, Stream, Option, Either } from "effect";

const numbers = [1, 2, 3];
const effect = Effect.forEach(numbers, (n) => Effect.succeed(n * 2));

const effects = [Effect.succeed(1), Effect.succeed(2)];
const allEffect = Effect.all(effects);

const options = [Option.some(1), Option.none(), Option.some(3)];
const filtered = options.filter(Option.isSome).map((o) => o.value);

const eithers = [Either.right(1), Either.left("fail"), Either.right(3)];
const rights = eithers
  .map(Either.getRight)
  .filter((o) => o._tag === "Some")
  .map((o) => o.value);

const stream = Stream.fromIterable([
  [1, 2],
  [3, 4],
]).pipe(Stream.flatMap((arr) => Stream.fromIterable(arr)));

const program = Effect.gen(function* () {
  const effectResult = yield* effect;
  yield* Effect.log(`Effect.forEach result: [${effectResult.join(", ")}]`);
  const allResult = yield* allEffect;
  yield* Effect.log(`Effect.all result: [${allResult.join(", ")}]`);
  yield* Effect.log(`Option collection result: [${filtered.join(", ")}]`);
  yield* Effect.log(`Either collection result: [${rights.join(", ")}]`);
  const streamValues: number[] = [];
  yield* Stream.runForEach(stream, (n) =>
    Effect.sync(() => streamValues.push(n))
  );
  yield* Effect.log(`Stream.flatMap result: [${streamValues.join(", ")}]`);
});

Effect.runPromise(program);
