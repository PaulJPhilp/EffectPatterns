# Observability Patterns

## Add Custom Metrics to Your Application

Use Metric.counter, Metric.gauge, and Metric.histogram to instrument code for monitoring.

### Example

This example creates a counter to track how many times a user is created and a histogram to track the duration of the database operation.

```typescript
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
const programWithLogging = Effect.gen(function* () {
  const result = yield* createUser;
  yield* Effect.log(`Result: ${JSON.stringify(result)}`);
  return result;
});

Effect.runPromise(programWithLogging);
```

---

---

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

## Instrument and Observe Function Calls with Effect.fn

Use Effect.fn to wrap functions with effectful instrumentation, such as logging, metrics, or tracing, in a composable and type-safe way.

### Example

```typescript
import { Effect } from "effect";

// A simple function to instrument
function add(a: number, b: number): number {
  return a + b;
}

// Wrap the function with Effect.fn to add logging and tracking
const addWithLogging = (a: number, b: number) =>
  Effect.gen(function* () {
    yield* Effect.logInfo(`Calling add with ${a} and ${b}`);
    const result = add(a, b);
    yield* Effect.logInfo(`Result: ${result}`);
    return result;
  });

// Use the instrumented function in an Effect workflow
const program = addWithLogging(2, 3).pipe(
  Effect.tap((sum) => Effect.logInfo(`Sum is ${sum}`))
);

// Run the program (commented to avoid runtime issues)
// Effect.runPromise(program);

```

**Explanation:**  
- `Effect.fn` wraps a function, returning a new function that produces an Effect.
- You can add logging, metrics, tracing, or any effectful logic before/after the call.
- Keeps instrumentation separate from business logic and fully composable.

---

## Integrate Effect Tracing with OpenTelemetry

Integrate Effect.withSpan with OpenTelemetry to export traces and visualize request flows across services.

### Example

```typescript
import { Effect } from "effect";
// Pseudocode: Replace with actual OpenTelemetry integration for your stack
import { trace, context, SpanStatusCode } from "@opentelemetry/api";

// Wrap an Effect.withSpan to export to OpenTelemetry
function withOtelSpan<T>(name: string, effect: Effect.Effect<unknown, T, unknown>) {
  return Effect.gen(function* () {
    const otelSpan = trace.getTracer("default").startSpan(name);
    try {
      const result = yield* effect;
      otelSpan.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      otelSpan.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
      throw err;
    } finally {
      otelSpan.end();
    }
  });
}

// Usage
const program = withOtelSpan("fetchUser", Effect.sync(() => {
  // ...fetch user logic
  return { id: 1, name: "Alice" };
}));
```

**Explanation:**  
- Start an OpenTelemetry span when entering an Effectful operation.
- Set status and attributes as needed.
- End the span when the operation completes or fails.
- This enables full distributed tracing and visualization in your observability platform.

---

## Leverage Effect's Built-in Structured Logging

Use Effect.log, Effect.logInfo, and Effect.logError to add structured, context-aware logging to your Effect code.

### Example

```typescript
import { Effect } from "effect";

// Log a simple message
const program = Effect.log("Starting the application");

// Log at different levels
const info = Effect.logInfo("User signed in");
const error = Effect.logError("Failed to connect to database");

// Log with dynamic values
const userId = 42;
const logUser = Effect.logInfo(`Processing user: ${userId}`);

// Use logging in a workflow
const workflow = Effect.gen(function* () {
  yield* Effect.log("Beginning workflow");
  // ... do some work
  yield* Effect.logInfo("Workflow step completed");
  // ... handle errors
  yield* Effect.logError("Something went wrong");
});
```

**Explanation:**  
- `Effect.log` logs a message at the default level.
- `Effect.logInfo` and `Effect.logError` log at specific levels.
- Logging is context-aware and can be used anywhere in your Effect workflows.

---

## Trace Operations Across Services with Spans

Use Effect.withSpan to create and annotate tracing spans for operations, enabling distributed tracing and performance analysis.

### Example

```typescript
import { Effect } from "effect";

// Trace a database query with a custom span
const fetchUser = Effect.sync(() => {
  // ...fetch user from database
  return { id: 1, name: "Alice" };
}).pipe(Effect.withSpan("db.fetchUser"));

// Trace an HTTP request with additional attributes
const fetchData = Effect.tryPromise({
  try: () => fetch("https://api.example.com/data").then((res) => res.json()),
  catch: (err) => `Network error: ${String(err)}`,
}).pipe(
  Effect.withSpan("http.fetchData", {
    attributes: { url: "https://api.example.com/data" },
  })
);

// Use spans in a workflow
const program = Effect.gen(function* () {
  yield* Effect.log("Starting workflow").pipe(
    Effect.withSpan("workflow.start")
  );
  const user = yield* fetchUser;
  yield* Effect.log(`Fetched user: ${user.name}`).pipe(
    Effect.withSpan("workflow.end")
  );
});

```

**Explanation:**  
- `Effect.withSpan` creates a tracing span around an operation.
- Spans can be named and annotated with attributes for richer context.
- Tracing enables distributed observability and performance analysis.

---

## Trace Operations Across Services with Spans

Use Effect.withSpan to create custom tracing spans for important operations.

### Example

This example shows a multi-step operation. Each step, and the overall operation, is wrapped in a span. This creates a parent-child hierarchy in the trace that is easy to visualize.

```typescript
import { Effect, Duration } from "effect";

const validateInput = (input: unknown) =>
  Effect.gen(function* () {
    yield* Effect.logInfo("Starting input validation...");
    yield* Effect.sleep(Duration.millis(10));
    const result = { email: "paul@example.com" };
    yield* Effect.logInfo(`✅ Input validated: ${result.email}`);
    return result;
  }).pipe(
    // This creates a child span
    Effect.withSpan("validateInput")
  );

const saveToDatabase = (user: { email: string }) =>
  Effect.gen(function* () {
    yield* Effect.logInfo(`Saving user to database: ${user.email}`);
    yield* Effect.sleep(Duration.millis(50));
    const result = { id: 123, ...user };
    yield* Effect.logInfo(`✅ User saved with ID: ${result.id}`);
    return result;
  }).pipe(
    // This span includes useful attributes
    Effect.withSpan("saveToDatabase", {
      attributes: { "db.system": "postgresql", "db.user.email": user.email },
    })
  );

const createUser = (input: unknown) =>
  Effect.gen(function* () {
    yield* Effect.logInfo("=== Creating User with Tracing ===");
    yield* Effect.logInfo(
      "This demonstrates how spans trace operations through the call stack"
    );

    const validated = yield* validateInput(input);
    const user = yield* saveToDatabase(validated);

    yield* Effect.logInfo(
      `✅ User creation completed: ${JSON.stringify(user)}`
    );
    yield* Effect.logInfo(
      "Note: In production, spans would be sent to a tracing system like Jaeger or Zipkin"
    );

    return user;
  }).pipe(
    // This is the parent span for the entire operation
    Effect.withSpan("createUserOperation")
  );

// Demonstrate the tracing functionality
const program = Effect.gen(function* () {
  yield* Effect.logInfo("=== Trace Operations with Spans Demo ===");

  // Create multiple users to show tracing in action
  const user1 = yield* createUser({ email: "user1@example.com" });

  yield* Effect.logInfo("\n--- Creating second user ---");
  const user2 = yield* createUser({ email: "user2@example.com" });

  yield* Effect.logInfo("\n=== Summary ===");
  yield* Effect.logInfo("Created users with tracing spans:");
  yield* Effect.logInfo(`User 1: ID ${user1.id}, Email: ${user1.email}`);
  yield* Effect.logInfo(`User 2: ID ${user2.id}, Email: ${user2.email}`);
});

// When run with a tracing SDK, this will produce traces with root spans
// "createUserOperation" and child spans: "validateInput" and "saveToDatabase".
Effect.runPromise(program);

```

---

---

