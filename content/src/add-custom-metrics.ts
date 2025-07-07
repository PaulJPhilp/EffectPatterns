import { Effect, Metric, Duration } from "effect";  // We don't need MetricBoundaries anymore

// 1. Define your metrics
const userRegisteredCounter = Metric.counter("users_registered_total", {
  description: "A counter for how many users have been registered.",
});

const dbDurationTimer = Metric.timer(
  "db_operation_duration",
  "A timer for DB operation durations"
);

// 2. Simulated database call
const saveUserToDb = Effect.succeed("user saved").pipe(
  Effect.delay(Duration.millis(Math.random() * 100)),
);

// 3. Instrument the business logic
const createUser = Effect.gen(function* () {
  // Time the operation
  yield* saveUserToDb.pipe(Metric.trackDuration(dbDurationTimer));

  // Increment the counter
  yield* Metric.increment(userRegisteredCounter);

  return { status: "success" };
});

// Run the Effect
Effect.runPromise(createUser).then(console.log);