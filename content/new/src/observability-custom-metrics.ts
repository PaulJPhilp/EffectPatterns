import { Effect, Metric, MetricBoundaries } from "effect";

// Define a counter metric for processed jobs
const jobsProcessed = Metric.counter("jobs_processed");

// Increment the counter when a job is processed
const processJob = Effect.gen(function* () {
  // ... process the job
  yield* Effect.log("Job processed");
  yield* Metric.increment(jobsProcessed);
});

// Define a gauge for current active users
const activeUsers = Metric.gauge("active_users");

// Update the gauge when users sign in or out
const userSignedIn = Metric.set(activeUsers, 1);
const userSignedOut = Metric.set(activeUsers, -1);

// Define a histogram for request durations
const requestDuration = Metric.histogram(
  "request_duration",
  MetricBoundaries.linear({ start: 0, width: 1, count: 6 })
);

// Record a request duration
const recordDuration = (duration: number) =>
  Metric.update(requestDuration, duration);
