import { Duration, Effect } from 'effect';

const oneSecond = Duration.seconds(1);
const fiveMinutes = Duration.minutes(5);
const twoHours = Duration.hours(2);

const total = Duration.sum(oneSecond, fiveMinutes);
const isLonger = Duration.greaterThan(twoHours, fiveMinutes);
const ms = Duration.toMillis(fiveMinutes);

const program = Effect.gen(function* () {
  yield* Effect.log(`oneSecond: ${Duration.toMillis(oneSecond)} ms`);
  yield* Effect.log(`fiveMinutes: ${Duration.toMillis(fiveMinutes)} ms`);
  yield* Effect.log(`twoHours: ${Duration.toMillis(twoHours)} ms`);
  yield* Effect.log(
    `total (oneSecond + fiveMinutes): ${Duration.toMillis(total)} ms`
  );
  yield* Effect.log(`is twoHours > fiveMinutes: ${isLonger}`);
  yield* Effect.log(`fiveMinutes in ms: ${ms}`);
});

Effect.runPromise(program);
