import { DateTime, Effect } from 'effect';

const program = Effect.gen(function* () {
  const now = yield* DateTime.now;
  const parsed = DateTime.unsafeMake(Date.parse('2024-07-19T12:34:56Z'));
  const inOneHour = now.pipe(DateTime.add({ hours: 1 }));
  const oneHourAgo = now.pipe(DateTime.subtract({ hours: 1 }));
  const iso = DateTime.format()(now);
  const isBefore = oneHourAgo.epochMillis < now.epochMillis;
  yield* Effect.log(`now: ${DateTime.format()(now)}`);
  yield* Effect.log(`parsed: ${DateTime.format()(parsed)}`);
  yield* Effect.log(`inOneHour: ${DateTime.format()(inOneHour)}`);
  yield* Effect.log(`oneHourAgo: ${DateTime.format()(oneHourAgo)}`);
  yield* Effect.log(`isBefore: ${isBefore}`);
});

Effect.runPromise(
  program.pipe(Effect.catchAll(() => Effect.succeed(undefined)))
);
