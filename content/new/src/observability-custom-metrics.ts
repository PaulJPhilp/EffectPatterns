import { Effect, Metric } from "effect";

// Define a counter metric for processed jobs
const jobsProcessed = Metric.counter("jobs_processed");

// Increment the counter when a job is processed
const processJob = Effect.gen(function* () {
  // ... process the job
  yield* Effect.log("Job processed");
  yield* Effect.updateMetric(jobsProcessed, 1);
});

// Define a gauge for current active users
const activeUsers = Metric.gauge("active_users");

// Update the gauge when users sign in or out
const userSignedIn = Effect.updateMetric(activeUsers, 1);
const userSignedOut = Effect.updateMetric(activeUsers, -1);

// Define a histogram for request durations
const requestDuration = Metric.histogram("request_duration", {
  boundaries: [0.1, 0.5, 1, 2, 5] // in seconds
});

// Record a request duration
const recordDuration = (duration: number) =>
  Effect.updateMetric(requestDuration, duration);