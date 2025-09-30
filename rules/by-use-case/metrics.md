# Metrics Patterns

## Add Custom Metrics to Your Application

Use Effect's Metric module to define and update custom metrics for business and performance monitoring.

### Example

```typescript
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

```

**Explanation:**  
- `Metric.counter` tracks counts of events.
- `Metric.gauge` tracks a value that can go up or down (e.g., active users).
- `Metric.histogram` tracks distributions (e.g., request durations).
- `Effect.updateMetric` updates the metric in your workflow.

---

