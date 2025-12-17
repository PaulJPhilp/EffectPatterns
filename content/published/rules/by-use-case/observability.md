# Observability Patterns

## Add Custom Metrics to Your Application

Use Effect's Metric module to define and update custom metrics for business and performance monitoring.

### Example

```typescript
import { Effect, Metric } from "effect";

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
const userSignedIn = Metric.set(activeUsers, 1); // Set to 1 (simplified example)
const userSignedOut = Metric.set(activeUsers, 0); // Set to 0 (simplified example)

// Define a histogram for request durations
const requestDuration = Metric.histogram("request_duration", [
  0.1, 0.5, 1, 2, 5,
] as any); // boundaries in seconds

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

// Use Effect.fn to instrument the function with observability
const addWithLogging = Effect.fn("add")(add).pipe(
  Effect.withSpan("add", { attributes: { "fn.name": "add" } })
);

// Use the instrumented function in an Effect workflow
const program = Effect.gen(function* () {
  yield* Effect.logInfo("Calling add function");
  const sum = yield* addWithLogging(2, 3);
  yield* Effect.logInfo(`Sum is ${sum}`);
  return sum;
});

// Run the program
Effect.runPromise(program);
```

**Explanation:**

- `Effect.fn("name")(fn)` wraps a function with instrumentation capabilities, enabling observability.
- You can add tracing spans, logging, metrics, and other observability logic to function boundaries.
- Keeps instrumentation separate from business logic and fully composable.
- The wrapped function integrates seamlessly with Effect's observability and tracing infrastructure.

---

## Integrate Effect Tracing with OpenTelemetry

Integrate Effect.withSpan with OpenTelemetry to export traces and visualize request flows across services.

### Example

```typescript
import { Effect } from "effect";
// Pseudocode: Replace with actual OpenTelemetry integration for your stack
import { trace, context, SpanStatusCode } from "@opentelemetry/api";

// Wrap an Effect.withSpan to export to OpenTelemetry
function withOtelSpan<T>(
  name: string,
  effect: Effect.Effect<unknown, T, unknown>
) {
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
const program = withOtelSpan(
  "fetchUser",
  Effect.sync(() => {
    // ...fetch user logic
    return { id: 1, name: "Alice" };
  })
);
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
const program = Effect.gen(function* () {
  yield* Effect.log("Starting the application");
});

// Log at different levels
const infoProgram = Effect.gen(function* () {
  yield* Effect.logInfo("User signed in");
});

const errorProgram = Effect.gen(function* () {
  yield* Effect.logError("Failed to connect to database");
});

// Log with dynamic values
const userId = 42;
const logUserProgram = Effect.gen(function* () {
  yield* Effect.logInfo(`Processing user: ${userId}`);
});

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

