import { Effect, Option, Stream } from 'effect';

const logThenCompute = Effect.log('Starting...').pipe(
  Effect.andThen(Effect.succeed(42))
);

const computeAndLog = Effect.succeed(42).pipe(
  Effect.tap((n) => Effect.log(`Result is ${n}`))
);

const nestedOption = Option.some(Option.some(1));
const flatOption = Option.flatten(nestedOption);

const nestedEffect = Effect.succeed(Effect.succeed(1));
const flatEffect = Effect.flatten(nestedEffect);

const mightFail = Effect.fail('fail!').pipe(
  Effect.tapError((err) => Effect.logError(`Error: ${err}`))
);

const stream = Stream.fromIterable([1, 2, 3]).pipe(
  Stream.tap((n) => Effect.log(`Saw: ${n}`))
);

const program = Effect.gen(function* () {
  const logThenComputeResult = yield* logThenCompute;
  yield* Effect.log(`logThenCompute (andThen) result: ${logThenComputeResult}`);
  const computeAndLogResult = yield* computeAndLog;
  yield* Effect.log(`computeAndLog (tap) result: ${computeAndLogResult}`);
  yield* Effect.log(
    `Option.flatten result: ${
      Option.isSome(flatOption) ? flatOption.value : 'None'
    }`
  );
  const flatEffectResult = yield* flatEffect;
  yield* Effect.log(`Effect.flatten result: ${flatEffectResult}`);
  yield* Effect.either(mightFail); // tapError logs error
  const streamValues: number[] = [];
  yield* Stream.runForEach(stream, (n) =>
    Effect.sync(() => streamValues.push(n))
  );
  yield* Effect.log(`Stream.tap result: [${streamValues.join(', ')}]`);
});

Effect.runPromise(program);
