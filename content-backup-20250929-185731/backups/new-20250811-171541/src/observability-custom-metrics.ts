import { Effect, Metric, MetricBoundaries } from "effect";

const jobsProcessed = Metric.counter("jobs_processed");
const processJob = Effect.gen(function* () {
  yield* Effect.log("Job processed");
  yield* Metric.increment(jobsProcessed);
});

const activeUsers = Metric.gauge("active_users");
const userSignedIn = Metric.set(activeUsers, 1);
const userSignedOut = Metric.set(activeUsers, 0);

const requestDuration = Metric.histogram(
  "request_duration",
  MetricBoundaries.linear({ start: 0, width: 0.5, count: 11 }),
  "Request duration in seconds"
);
const recordDuration = (duration: number) =>
  Metric.update(requestDuration, duration);

const program = Effect.gen(function* () {
  yield* processJob;
  yield* userSignedIn;
  yield* Effect.log("User signed in");
  yield* userSignedOut;
  yield* Effect.log("User signed out");
  yield* recordDuration(0.7);
  yield* Effect.log("Recorded request duration: 0.7s");
});

Effect.runPromise(program);
