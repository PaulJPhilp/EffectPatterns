import { Effect, Metric, Duration } from "effect";

// 1. Define your metrics. It's good practice to keep them in one place.
const userRegisteredCounter = Metric.counter("users_registered_total", {
  description: "A counter for how many users have been registered.",
});

const dbDurationHistogram = Metric.histogram(
  "db_operation_duration_seconds",
  Metric.Histogram.Boundaries.exponential({ start: 0.01, factor: 2, count: 10 }),
);

// 2. A simulated database call
const saveUserToDb = Effect.succeed("user saved").pipe(
  Effect.delay(Duration.millis(Math.random() * 100)),
);

// 3. Instrument the business logic
const createUser = Effect.gen(function* () {
  // Use .pipe() and Metric.trackDuration to time the operation
  yield* saveUserToDb.pipe(Metric.trackDuration(dbDurationHistogram));

  // Use Metric.increment to update the counter
  yield* Metric.increment(userRegisteredCounter);

  return { status: "success" };
});

// When run with a metrics backend, these metrics would be exported.
Effect.runPromise(createUser);