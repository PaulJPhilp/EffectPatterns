## Add Custom Metrics to Your Application
**Rule:** Use Metric.counter, Metric.gauge, and Metric.histogram to instrument code for monitoring.

### Example
This example creates a counter to track how many times a user is created and a histogram to track the duration of the database operation.

```typescript
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
```

---

## Trace Operations Across Services with Spans
**Rule:** Use Effect.withSpan to create custom tracing spans for important operations.

### Example
This example shows a multi-step operation. Each step, and the overall operation, is wrapped in a span. This creates a parent-child hierarchy in the trace that is easy to visualize.

```typescript
import { Effect } from "effect";

const validateInput = (input: unknown) =>
  Effect.succeed({ email: "paul@example.com" }).pipe(
    Effect.delay("10 millis"),
    // This creates a child span
    Effect.withSpan("validateInput"),
  );

const saveToDatabase = (user: { email: string }) =>
  Effect.succeed({ id: 123, ...user }).pipe(
    Effect.delay("50 millis"),
    // This span includes useful attributes
    Effect.withSpan("saveToDatabase", {
      attributes: { "db.system": "postgresql", "db.user.email": user.email },
    }),
  );

const createUser = (input: unknown) =>
  Effect.gen(function* () {
    const validated = yield* validateInput(input);
    const user = yield* saveToDatabase(validated);
    return user;
  }).pipe(
    // This is the parent span for the entire operation
    Effect.withSpan("createUserOperation"),
  );

// When run with a tracing SDK, this will produce a trace with a root span
// "createUserOperation" and two child spans: "validateInput" and "saveToDatabase".
Effect.runPromise(createUser({}));
```

---