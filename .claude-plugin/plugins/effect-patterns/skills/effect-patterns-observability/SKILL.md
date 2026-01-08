---
name: effect-patterns-observability
description: Effect-TS patterns for Observability. Use when working with observability in Effect-TS applications.
---
# Effect-TS Patterns: Observability
This skill provides 13 curated Effect-TS patterns for observability.
Use this skill when working on tasks related to:
- observability
- Best practices in Effect-TS applications
- Real-world patterns and solutions

---

## 🟢 Beginner Patterns

### Debug Effect Programs

**Rule:** Use Effect.tap and logging to inspect values without changing program flow.

**Good Example:**

```typescript
import { Effect, pipe } from "effect"

// ============================================
// 1. Using tap to inspect values
// ============================================

const fetchUser = (id: string) =>
  Effect.succeed({ id, name: "Alice", email: "alice@example.com" })

const processUser = (id: string) =>
  fetchUser(id).pipe(
    // tap runs an effect for its side effect, then continues with original value
    Effect.tap((user) => Effect.log(`Fetched user: ${user.name}`)),
    Effect.map((user) => ({ ...user, processed: true })),
    Effect.tap((user) => Effect.log(`Processed: ${JSON.stringify(user)}`))
  )

// ============================================
// 2. Debug a pipeline
// ============================================

const numbers = [1, 2, 3, 4, 5]

const pipeline = Effect.gen(function* () {
  yield* Effect.log("Starting pipeline")

  const step1 = numbers.filter((n) => n % 2 === 0)
  yield* Effect.log(`After filter (even): ${JSON.stringify(step1)}`)

  const step2 = step1.map((n) => n * 10)
  yield* Effect.log(`After map (*10): ${JSON.stringify(step2)}`)

  const step3 = step2.reduce((a, b) => a + b, 0)
  yield* Effect.log(`After reduce (sum): ${step3}`)

  return step3
})

// ============================================
// 3. Debug errors
// ============================================

const riskyOperation = (shouldFail: boolean) =>
  Effect.gen(function* () {
    yield* Effect.log("Starting risky operation")

    if (shouldFail) {
      yield* Effect.log("About to fail...")
      return yield* Effect.fail(new Error("Something went wrong"))
    }

    yield* Effect.log("Success!")
    return "result"
  })

const debugErrors = riskyOperation(true).pipe(
  // Log when operation fails
  Effect.tapError((error) => Effect.log(`Operation failed: ${error.message}`)),

  // Provide a fallback
  Effect.catchAll((error) => {
    return Effect.succeed(`Recovered from: ${error.message}`)
  })
)

// ============================================
// 4. Trace execution flow
// ============================================

const step = (name: string, value: number) =>
  Effect.gen(function* () {
    yield* Effect.log(`[${name}] Input: ${value}`)
    const result = value * 2
    yield* Effect.log(`[${name}] Output: ${result}`)
    return result
  })

const tracedWorkflow = Effect.gen(function* () {
  const a = yield* step("Step 1", 5)
  const b = yield* step("Step 2", a)
  const c = yield* step("Step 3", b)
  yield* Effect.log(`Final result: ${c}`)
  return c
})

// ============================================
// 5. Quick debug with console
// ============================================

// Sometimes you just need console.log
const quickDebug = Effect.gen(function* () {
  const value = yield* Effect.succeed(42)
  
  // Effect.sync wraps side effects
  yield* Effect.sync(() => console.log("Quick debug:", value))
  
  return value
})

// ============================================
// 6. Run examples
// ============================================

const program = Effect.gen(function* () {
  yield* Effect.log("=== Tap Example ===")
  yield* processUser("123")

  yield* Effect.log("\n=== Pipeline Debug ===")
  yield* pipeline

  yield* Effect.log("\n=== Error Debug ===")
  yield* debugErrors

  yield* Effect.log("\n=== Traced Workflow ===")
  yield* tracedWorkflow
})

Effect.runPromise(program)
```

**Rationale:**

Use `Effect.tap` to inspect values and `Effect.log` to trace execution without changing program behavior.

---


Debugging Effect code differs from imperative code:

1. **No breakpoints** - Effects are descriptions, not executions
2. **Lazy evaluation** - Code runs later when you call `runPromise`
3. **Composition** - Effects chain together

`tap` and logging let you see inside without breaking the chain.

---

---

### Your First Logs

**Rule:** Use Effect.log and related functions for structured, contextual logging.

**Good Example:**

```typescript
import { Effect, Logger, LogLevel } from "effect"

// ============================================
// 1. Basic logging
// ============================================

const basicLogging = Effect.gen(function* () {
  // Different log levels
  yield* Effect.logDebug("Debug message - for development")
  yield* Effect.logInfo("Info message - normal operation")
  yield* Effect.log("Default log - same as logInfo")
  yield* Effect.logWarning("Warning - something unusual")
  yield* Effect.logError("Error - something went wrong")
})

// ============================================
// 2. Logging with context
// ============================================

const withContext = Effect.gen(function* () {
  // Add structured data to logs
  yield* Effect.log("User logged in").pipe(
    Effect.annotateLogs({
      userId: "user-123",
      action: "login",
      ipAddress: "192.168.1.1",
    })
  )

  // Add a single annotation
  yield* Effect.log("Processing request").pipe(
    Effect.annotateLogs("requestId", "req-456")
  )
})

// ============================================
// 3. Log spans for timing
// ============================================

const withTiming = Effect.gen(function* () {
  yield* Effect.log("Starting operation")

  // withLogSpan adds timing information
  yield* Effect.sleep("100 millis").pipe(
    Effect.withLogSpan("database-query")
  )

  yield* Effect.log("Operation complete")
})

// ============================================
// 4. Practical example
// ============================================

interface User {
  id: string
  email: string
}

const processOrder = (orderId: string, userId: string) =>
  Effect.gen(function* () {
    yield* Effect.logInfo("Processing order").pipe(
      Effect.annotateLogs({ orderId, userId })
    )

    // Simulate work
    yield* Effect.sleep("50 millis")

    yield* Effect.logInfo("Order processed successfully").pipe(
      Effect.annotateLogs({ orderId, status: "completed" })
    )

    return { orderId, status: "completed" }
  }).pipe(
    Effect.withLogSpan("processOrder")
  )

// ============================================
// 5. Configure log level
// ============================================

const debugProgram = basicLogging.pipe(
  // Show all logs including debug
  Logger.withMinimumLogLevel(LogLevel.Debug)
)

const productionProgram = basicLogging.pipe(
  // Only show warnings and errors
  Logger.withMinimumLogLevel(LogLevel.Warning)
)

// ============================================
// 6. Run
// ============================================

const program = Effect.gen(function* () {
  yield* Effect.log("=== Basic Logging ===")
  yield* basicLogging

  yield* Effect.log("\n=== With Context ===")
  yield* withContext

  yield* Effect.log("\n=== With Timing ===")
  yield* withTiming

  yield* Effect.log("\n=== Process Order ===")
  yield* processOrder("order-789", "user-123")
})

Effect.runPromise(program)
```

**Rationale:**

Use Effect's built-in logging functions for structured, contextual logging that works with any logging backend.

---


Effect's logging is superior to `console.log`:

1. **Structured** - Logs are data, not just strings
2. **Contextual** - Automatically includes fiber info, timestamps
3. **Configurable** - Change log levels, formats, destinations
4. **Type-safe** - Part of the Effect type system

---

---


## 🟡 Intermediate Patterns

### Instrument and Observe Function Calls with Effect.fn

**Rule:** Use Effect.fn to wrap functions with effectful instrumentation, such as logging, metrics, or tracing, in a composable and type-safe way.

**Good Example:**

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

**Anti-Pattern:**

Scattering logging, metrics, or tracing logic directly inside business functions, making code harder to test, maintain, and compose.

**Rationale:**

Use `Effect.fn` to wrap and instrument function calls with effectful logic, such as logging, metrics, or tracing.  
This enables you to observe, monitor, and debug function boundaries in a composable, type-safe way.


Instrumenting function calls is essential for observability, especially in complex or critical code paths.  
`Effect.fn` lets you add effectful logic (logging, metrics, tracing, etc.) before, after, or around any function call, without changing the function’s core logic.

---

### Leverage Effect's Built-in Structured Logging

**Rule:** Use Effect.log, Effect.logInfo, and Effect.logError to add structured, context-aware logging to your Effect code.

**Good Example:**

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

**Anti-Pattern:**

Using `console.log` or ad-hoc logging scattered throughout your code, which is not structured, not context-aware, and harder to manage in production.

**Rationale:**

Use `Effect.log`, `Effect.logInfo`, `Effect.logError`, and related functions to add structured, context-aware logging to your Effect code.  
This enables you to capture important events, errors, and business information in a consistent and configurable way.


Structured logging makes it easier to search, filter, and analyze logs in production.  
Effect’s logging functions are context-aware, meaning they automatically include relevant metadata and can be configured globally.

---

### Add Custom Metrics to Your Application

**Rule:** Use Metric.counter, Metric.gauge, and Metric.histogram to instrument code for monitoring.

**Good Example:**

This example creates a counter to track how many times a user is created and a histogram to track the duration of the database operation.

```typescript
import { Effect, Metric, Duration } from "effect"; // We don't need MetricBoundaries anymore

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
  Effect.delay(Duration.millis(Math.random() * 100))
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

**Anti-Pattern:**

Not adding any metrics to your application. Without metrics, you are flying blind. You have no high-level overview of your application's health, performance, or business KPIs. You can't build dashboards, you can't set up alerts for abnormal behavior (e.g., "error rate is too high"), and you are forced to rely on digging through logs to
understand the state of your system.

**Rationale:**

To monitor the health and performance of your application, instrument your code with `Metric`s. The three main types are:

- **`Metric.counter("name")`**: To count occurrences of an event (e.g., `users_registered_total`). It only goes up.
- **`Metric.gauge("name")`**: To track a value that can go up or down (e.g., `active_connections`).
- **`Metric.histogram("name")`**: To track the distribution of a value (e.g., `request_duration_seconds`).

---


While logs are for events and traces are for requests, metrics are for aggregation. They provide a high-level, numerical view of your system's health over time, which is perfect for building dashboards and setting up alerts.

Effect's `Metric` module provides a simple, declarative way to add this instrumentation. By defining your metrics upfront, you can then use operators like `Metric.increment` or `Effect.timed` to update them. This is fully integrated with Effect's context system, allowing you to provide different metric backends (like Prometheus or StatsD) via a `Layer`.

This allows you to answer questions like:

- "What is our user sign-up rate over the last 24 hours?"
- "Are we approaching our maximum number of database connections?"
- "What is the 95th percentile latency for our API requests?"

---

---

### Add Custom Metrics to Your Application

**Rule:** Use Effect's Metric module to define and update custom metrics for business and performance monitoring.

**Good Example:**

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

**Anti-Pattern:**

Relying solely on logs for monitoring, or using ad-hoc counters and variables that are not integrated with your observability stack.

**Rationale:**

Use Effect's `Metric` module to define and update custom metrics such as counters, gauges, and histograms.  
This allows you to track business events, performance indicators, and system health in a type-safe and composable way.


Metrics provide quantitative insight into your application's behavior and performance.  
By instrumenting your code with metrics, you can monitor key events, detect anomalies, and drive business decisions.

---

### Trace Operations Across Services with Spans

**Rule:** Use Effect.withSpan to create and annotate tracing spans for operations, enabling distributed tracing and performance analysis.

**Good Example:**

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

**Anti-Pattern:**

Relying only on logs or metrics for performance analysis, or lacking visibility into the flow of requests and operations across services.

**Rationale:**

Use `Effect.withSpan` to create custom tracing spans around important operations in your application.  
This enables distributed tracing, performance analysis, and deep visibility into how requests flow through your system.


Tracing spans help you understand the flow and timing of operations, especially in distributed systems or complex workflows.  
They allow you to pinpoint bottlenecks, visualize dependencies, and correlate logs and metrics with specific requests.

---

### Trace Operations Across Services with Spans

**Rule:** Use Effect.withSpan to create custom tracing spans for important operations.

**Good Example:**

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

**Anti-Pattern:**

Not adding custom spans to your business logic.
Without them, your traces will only show high-level information from your framework (e.g., "HTTP POST /users").
You will have no visibility into the performance of the individual steps _inside_ your request handler, making it very difficult to pinpoint bottlenecks. Your application's logic remains a "black box" in your traces.

**Rationale:**

To gain visibility into the performance and flow of your application, wrap logical units of work with `Effect.withSpan("span-name")`. You can add contextual information to these spans using the `attributes` option.

---


While logs tell you _what_ happened, traces tell you _why it was slow_. In a complex application, a single user request might trigger calls to multiple services (authentication, database, external APIs). Tracing allows you to visualize this entire chain of events as a single, hierarchical "trace."

Each piece of work in that trace is a `span`. `Effect.withSpan` allows you to create your own custom spans. This is invaluable for answering questions like:

- "For this API request, did we spend most of our time in the database or calling the external payment gateway?"
- "Which part of our user creation logic is the bottleneck?"

Effect's tracing is built on OpenTelemetry, the industry standard, so it integrates seamlessly with tools like Jaeger, Zipkin, and Datadog.

---

---


## 🟠 Advanced Patterns

### Create Observability Dashboards

**Rule:** Create focused dashboards that answer specific questions about system health.

**Rationale:**

Design dashboards that answer specific questions about system health, performance, and user experience.

---


Good dashboards provide:

1. **Quick health check** - See problems at a glance
2. **Trend analysis** - Spot gradual degradation
3. **Debugging aid** - Correlate metrics during incidents
4. **Capacity planning** - Forecast resource needs

---

---

### Set Up Alerting

**Rule:** Create alerts based on SLOs and symptoms, not causes.

**Good Example:**

```typescript
import { Effect, Metric, Schedule, Duration, Ref } from "effect"

// ============================================
// 1. Define alertable conditions
// ============================================

interface Alert {
  readonly name: string
  readonly severity: "critical" | "warning" | "info"
  readonly message: string
  readonly timestamp: Date
  readonly labels: Record<string, string>
}

interface AlertRule {
  readonly name: string
  readonly condition: Effect.Effect<boolean>
  readonly severity: "critical" | "warning" | "info"
  readonly message: string
  readonly labels: Record<string, string>
  readonly forDuration: Duration.DurationInput
}

// ============================================
// 2. Define alert rules
// ============================================

const createAlertRules = (metrics: {
  errorRate: () => Effect.Effect<number>
  latencyP99: () => Effect.Effect<number>
  availability: () => Effect.Effect<number>
}): AlertRule[] => [
  {
    name: "HighErrorRate",
    condition: metrics.errorRate().pipe(Effect.map((rate) => rate > 0.01)),
    severity: "critical",
    message: "Error rate exceeds 1%",
    labels: { team: "backend", service: "api" },
    forDuration: "5 minutes",
  },
  {
    name: "HighLatency",
    condition: metrics.latencyP99().pipe(Effect.map((p99) => p99 > 2)),
    severity: "warning",
    message: "P99 latency exceeds 2 seconds",
    labels: { team: "backend", service: "api" },
    forDuration: "10 minutes",
  },
  {
    name: "LowAvailability",
    condition: metrics.availability().pipe(Effect.map((avail) => avail < 99.9)),
    severity: "critical",
    message: "Availability below 99.9% SLO",
    labels: { team: "backend", service: "api" },
    forDuration: "5 minutes",
  },
  {
    name: "ErrorBudgetLow",
    condition: Effect.succeed(false), // Implement based on error budget calc
    severity: "warning",
    message: "Error budget below 25%",
    labels: { team: "backend", service: "api" },
    forDuration: "0 seconds",
  },
]

// ============================================
// 3. Alert manager
// ============================================

interface AlertState {
  readonly firing: Map<string, { since: Date; alert: Alert }>
  readonly resolved: Alert[]
}

const makeAlertManager = Effect.gen(function* () {
  const state = yield* Ref.make<AlertState>({
    firing: new Map(),
    resolved: [],
  })

  const checkRule = (rule: AlertRule) =>
    Effect.gen(function* () {
      const isTriggered = yield* rule.condition

      yield* Ref.modify(state, (s) => {
        const firing = new Map(s.firing)
        const resolved = [...s.resolved]
        const key = rule.name

        if (isTriggered) {
          if (!firing.has(key)) {
            // New alert
            firing.set(key, {
              since: new Date(),
              alert: {
                name: rule.name,
                severity: rule.severity,
                message: rule.message,
                timestamp: new Date(),
                labels: rule.labels,
              },
            })
          }
        } else {
          if (firing.has(key)) {
            // Alert resolved
            const prev = firing.get(key)!
            resolved.push({
              ...prev.alert,
              message: `[RESOLVED] ${prev.alert.message}`,
              timestamp: new Date(),
            })
            firing.delete(key)
          }
        }

        return [undefined, { firing, resolved }]
      })
    })

  const getActiveAlerts = () =>
    Ref.get(state).pipe(
      Effect.map((s) => Array.from(s.firing.values()).map((f) => f.alert))
    )

  const getRecentResolved = () =>
    Ref.get(state).pipe(Effect.map((s) => s.resolved.slice(-10)))

  return {
    checkRule,
    getActiveAlerts,
    getRecentResolved,
  }
})

// ============================================
// 4. Alert notification
// ============================================

interface NotificationChannel {
  readonly send: (alert: Alert) => Effect.Effect<void>
}

const slackChannel: NotificationChannel = {
  send: (alert) =>
    Effect.gen(function* () {
      const emoji =
        alert.severity === "critical"
          ? "🔴"
          : alert.severity === "warning"
            ? "🟡"
            : "🔵"

      yield* Effect.log(`${emoji} [${alert.severity.toUpperCase()}] ${alert.name}`).pipe(
        Effect.annotateLogs({
          message: alert.message,
          labels: JSON.stringify(alert.labels),
        })
      )

      // In real implementation: call Slack API
    }),
}

const pagerDutyChannel: NotificationChannel = {
  send: (alert) =>
    Effect.gen(function* () {
      if (alert.severity === "critical") {
        yield* Effect.log("PagerDuty: Creating incident").pipe(
          Effect.annotateLogs({ alert: alert.name })
        )
        // In real implementation: call PagerDuty API
      }
    }),
}

// ============================================
// 5. Alert evaluation loop
// ============================================

const runAlertEvaluation = (
  rules: AlertRule[],
  channels: NotificationChannel[],
  interval: Duration.DurationInput
) =>
  Effect.gen(function* () {
    const alertManager = yield* makeAlertManager
    const previousAlerts = yield* Ref.make(new Set<string>())

    yield* Effect.forever(
      Effect.gen(function* () {
        // Check all rules
        for (const rule of rules) {
          yield* alertManager.checkRule(rule)
        }

        // Get current active alerts
        const active = yield* alertManager.getActiveAlerts()
        const current = new Set(active.map((a) => a.name))
        const previous = yield* Ref.get(previousAlerts)

        // Find newly firing alerts
        for (const alert of active) {
          if (!previous.has(alert.name)) {
            // New alert - send notifications
            for (const channel of channels) {
              yield* channel.send(alert)
            }
          }
        }

        yield* Ref.set(previousAlerts, current)
        yield* Effect.sleep(interval)
      })
    )
  })

// ============================================
// 6. Prometheus alerting rules (YAML)
// ============================================

const prometheusAlertRules = `
groups:
  - name: effect-app-alerts
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_errors_total[5m]))
          /
          sum(rate(http_requests_total[5m]))
          > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"

      - alert: HighLatency
        expr: |
          histogram_quantile(0.99,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
          ) > 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High P99 latency"
          description: "P99 latency is {{ $value }}s"

      - alert: SLOViolation
        expr: |
          sum(rate(http_requests_total{status!~"5.."}[30m]))
          /
          sum(rate(http_requests_total[30m]))
          < 0.999
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "SLO violation"
          description: "Availability is {{ $value | humanizePercentage }}"
`
```

**Rationale:**

Set up alerts based on user-facing symptoms (SLO violations) rather than system metrics (CPU usage).

---


Good alerting:

1. **Catches real problems** - Alerts when users are affected
2. **Reduces noise** - Fewer false positives
3. **Enables response** - Actionable information
4. **Supports SLOs** - Tracks service level objectives

---

---

### Export Metrics to Prometheus

**Rule:** Use Effect metrics and expose a /metrics endpoint for Prometheus scraping.

**Good Example:**

```typescript
import { Effect, Metric, MetricLabel, Duration } from "effect"
import { HttpServerResponse } from "@effect/platform"

// ============================================
// 1. Define application metrics
// ============================================

// Counter - counts events
const httpRequestsTotal = Metric.counter("http_requests_total", {
  description: "Total number of HTTP requests",
})

// Counter with labels
const httpRequestsByStatus = Metric.counter("http_requests_by_status", {
  description: "HTTP requests by status code",
})

// Gauge - current value
const activeConnections = Metric.gauge("active_connections", {
  description: "Number of active connections",
})

// Histogram - distribution of values
const requestDuration = Metric.histogram("http_request_duration_seconds", {
  description: "HTTP request duration in seconds",
  boundaries: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
})

// Summary - percentiles
const responseSizeBytes = Metric.summary("http_response_size_bytes", {
  description: "HTTP response size in bytes",
  maxAge: Duration.minutes(5),
  maxSize: 100,
  quantiles: [0.5, 0.9, 0.99],
})

// ============================================
// 2. Instrument code with metrics
// ============================================

const handleRequest = (path: string, status: number) =>
  Effect.gen(function* () {
    const startTime = Date.now()

    // Increment request counter
    yield* Metric.increment(httpRequestsTotal)

    // Increment with labels
    yield* Metric.increment(
      httpRequestsByStatus.pipe(
        Metric.tagged("status", String(status)),
        Metric.tagged("path", path)
      )
    )

    // Track active connections
    yield* Metric.increment(activeConnections)

    // Simulate work
    yield* Effect.sleep("100 millis")

    // Record duration
    const duration = (Date.now() - startTime) / 1000
    yield* Metric.update(requestDuration, duration)

    // Record response size
    yield* Metric.update(responseSizeBytes, 1024)

    // Decrement active connections
    yield* Metric.decrement(activeConnections)
  })

// ============================================
// 3. Prometheus text format exporter
// ============================================

interface MetricSnapshot {
  name: string
  type: "counter" | "gauge" | "histogram" | "summary"
  help: string
  values: Array<{
    labels: Record<string, string>
    value: number
  }>
  // For histograms
  buckets?: Array<{
    le: number
    count: number
    labels?: Record<string, string>
  }>
  sum?: number
  count?: number
}

const formatPrometheusMetrics = (metrics: MetricSnapshot[]): string => {
  const lines: string[] = []

  for (const metric of metrics) {
    // Help line
    lines.push(`# HELP ${metric.name} ${metric.help}`)
    lines.push(`# TYPE ${metric.name} ${metric.type}`)

    // Values
    for (const { labels, value } of metric.values) {
      const labelStr = Object.entries(labels)
        .map(([k, v]) => `${k}="${v}"`)
        .join(",")

      if (labelStr) {
        lines.push(`${metric.name}{${labelStr}} ${value}`)
      } else {
        lines.push(`${metric.name} ${value}`)
      }
    }

    // Histogram buckets
    if (metric.buckets) {
      for (const bucket of metric.buckets) {
        const labelStr = Object.entries(bucket.labels || {})
          .map(([k, v]) => `${k}="${v}"`)
          .concat([`le="${bucket.le}"`])
          .join(",")
        lines.push(`${metric.name}_bucket{${labelStr}} ${bucket.count}`)
      }
      lines.push(`${metric.name}_sum ${metric.sum}`)
      lines.push(`${metric.name}_count ${metric.count}`)
    }

    lines.push("")
  }

  return lines.join("\n")
}

// ============================================
// 4. /metrics endpoint handler
// ============================================

const metricsHandler = Effect.gen(function* () {
  // In real implementation, read from Effect's MetricRegistry
  const metrics: MetricSnapshot[] = [
    {
      name: "http_requests_total",
      type: "counter",
      help: "Total number of HTTP requests",
      values: [{ labels: {}, value: 1234 }],
    },
    {
      name: "http_requests_by_status",
      type: "counter",
      help: "HTTP requests by status code",
      values: [
        { labels: { status: "200", path: "/api/users" }, value: 1000 },
        { labels: { status: "404", path: "/api/users" }, value: 50 },
        { labels: { status: "500", path: "/api/users" }, value: 10 },
      ],
    },
    {
      name: "active_connections",
      type: "gauge",
      help: "Number of active connections",
      values: [{ labels: {}, value: 42 }],
    },
    {
      name: "http_request_duration_seconds",
      type: "histogram",
      help: "HTTP request duration in seconds",
      values: [],
      buckets: [
        { le: 0.01, count: 100 },
        { le: 0.05, count: 500 },
        { le: 0.1, count: 800 },
        { le: 0.25, count: 950 },
        { le: 0.5, count: 990 },
        { le: 1, count: 999 },
        { le: Infinity, count: 1000 },
      ],
      sum: 123.456,
      count: 1000,
    },
  ]

  const body = formatPrometheusMetrics(metrics)

  return HttpServerResponse.text(body, {
    headers: {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
    },
  })
})

// ============================================
// 5. Example output
// ============================================

/*
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total 1234

# HELP http_requests_by_status HTTP requests by status code
# TYPE http_requests_by_status counter
http_requests_by_status{status="200",path="/api/users"} 1000
http_requests_by_status{status="404",path="/api/users"} 50
http_requests_by_status{status="500",path="/api/users"} 10

# HELP active_connections Number of active connections
# TYPE active_connections gauge
active_connections 42

# HELP http_request_duration_seconds HTTP request duration in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.01"} 100
http_request_duration_seconds_bucket{le="0.05"} 500
http_request_duration_seconds_bucket{le="0.1"} 800
http_request_duration_seconds_bucket{le="+Inf"} 1000
http_request_duration_seconds_sum 123.456
http_request_duration_seconds_count 1000
*/
```

**Rationale:**

Create metrics with Effect's Metric API and expose them via an HTTP endpoint in Prometheus text format.

---


Prometheus metrics enable:

1. **Real-time monitoring** - See what's happening now
2. **Historical analysis** - Track trends over time
3. **Alerting** - Get notified of issues
4. **Dashboards** - Visualize system health

---

---

### Implement Distributed Tracing

**Rule:** Propagate trace context across service boundaries to correlate requests.

**Good Example:**

```typescript
import { Effect, Context, Layer } from "effect"
import { HttpClient, HttpClientRequest, HttpServerRequest, HttpServerResponse } from "@effect/platform"

// ============================================
// 1. Define trace context
// ============================================

interface TraceContext {
  readonly traceId: string
  readonly spanId: string
  readonly parentSpanId?: string
  readonly sampled: boolean
}

class CurrentTrace extends Context.Tag("CurrentTrace")<
  CurrentTrace,
  TraceContext
>() {}

// W3C Trace Context header names
const TRACEPARENT_HEADER = "traceparent"
const TRACESTATE_HEADER = "tracestate"

// ============================================
// 2. Generate trace IDs
// ============================================

const generateTraceId = (): string =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")

const generateSpanId = (): string =>
  Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")

// ============================================
// 3. Parse and format trace context
// ============================================

const parseTraceparent = (header: string): TraceContext | null => {
  // Format: 00-traceId-spanId-flags
  const parts = header.split("-")
  if (parts.length !== 4) return null

  return {
    traceId: parts[1],
    spanId: generateSpanId(),  // New span for this service
    parentSpanId: parts[2],
    sampled: parts[3] === "01",
  }
}

const formatTraceparent = (ctx: TraceContext): string =>
  `00-${ctx.traceId}-${ctx.spanId}-${ctx.sampled ? "01" : "00"}`

// ============================================
// 4. Extract trace from incoming request
// ============================================

const extractTraceContext = Effect.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest

  const traceparent = request.headers[TRACEPARENT_HEADER]

  if (traceparent) {
    const parsed = parseTraceparent(traceparent)
    if (parsed) {
      yield* Effect.log("Extracted trace context").pipe(
        Effect.annotateLogs({
          traceId: parsed.traceId,
          parentSpanId: parsed.parentSpanId,
        })
      )
      return parsed
    }
  }

  // No incoming trace - start a new one
  const newTrace: TraceContext = {
    traceId: generateTraceId(),
    spanId: generateSpanId(),
    sampled: Math.random() < 0.1,  // 10% sampling
  }

  yield* Effect.log("Started new trace").pipe(
    Effect.annotateLogs({ traceId: newTrace.traceId })
  )

  return newTrace
})

// ============================================
// 5. Propagate trace to outgoing requests
// ============================================

const makeTracedHttpClient = Effect.gen(function* () {
  const baseClient = yield* HttpClient.HttpClient
  const trace = yield* CurrentTrace

  return {
    get: (url: string) =>
      Effect.gen(function* () {
        // Create child span for outgoing request
        const childSpan: TraceContext = {
          traceId: trace.traceId,
          spanId: generateSpanId(),
          parentSpanId: trace.spanId,
          sampled: trace.sampled,
        }

        yield* Effect.log("Making traced HTTP request").pipe(
          Effect.annotateLogs({
            traceId: childSpan.traceId,
            spanId: childSpan.spanId,
            url,
          })
        )

        const request = HttpClientRequest.get(url).pipe(
          HttpClientRequest.setHeader(
            TRACEPARENT_HEADER,
            formatTraceparent(childSpan)
          )
        )

        return yield* baseClient.execute(request)
      }),
  }
})

// ============================================
// 6. Tracing middleware for HTTP server
// ============================================

const withTracing = <A, E, R>(
  handler: Effect.Effect<A, E, R | CurrentTrace>
): Effect.Effect<A, E, R | HttpServerRequest.HttpServerRequest> =>
  Effect.gen(function* () {
    const traceContext = yield* extractTraceContext

    return yield* handler.pipe(
      Effect.provideService(CurrentTrace, traceContext),
      Effect.withLogSpan(`request-${traceContext.spanId}`),
      Effect.annotateLogs({
        "trace.id": traceContext.traceId,
        "span.id": traceContext.spanId,
        "parent.span.id": traceContext.parentSpanId ?? "none",
      })
    )
  })

// ============================================
// 7. Example: Service A calls Service B
// ============================================

// Service B handler
const serviceBHandler = withTracing(
  Effect.gen(function* () {
    const trace = yield* CurrentTrace
    yield* Effect.log("Service B processing request")

    // Simulate work
    yield* Effect.sleep("50 millis")

    return HttpServerResponse.json({
      message: "Hello from Service B",
      traceId: trace.traceId,
    })
  })
)

// Service A handler (calls Service B)
const serviceAHandler = withTracing(
  Effect.gen(function* () {
    const trace = yield* CurrentTrace
    yield* Effect.log("Service A processing request")

    // Call Service B with trace propagation
    const tracedClient = yield* makeTracedHttpClient
    const response = yield* tracedClient.get("http://service-b/api/data")

    yield* Effect.log("Service A received response from B")

    return HttpServerResponse.json({
      message: "Hello from Service A",
      traceId: trace.traceId,
    })
  })
)

// ============================================
// 8. Run and observe
// ============================================

const program = Effect.gen(function* () {
  yield* Effect.log("=== Distributed Tracing Demo ===")

  // Simulate incoming request with trace
  const incomingTrace: TraceContext = {
    traceId: generateTraceId(),
    spanId: generateSpanId(),
    sampled: true,
  }

  yield* Effect.log("Processing traced request").pipe(
    Effect.provideService(CurrentTrace, incomingTrace),
    Effect.annotateLogs({
      "trace.id": incomingTrace.traceId,
      "span.id": incomingTrace.spanId,
    })
  )
})

Effect.runPromise(program)
```

**Rationale:**

Implement distributed tracing by propagating trace context through HTTP headers and using consistent span naming across services.

---


Distributed tracing shows the complete request journey:

1. **End-to-end visibility** - See entire request flow
2. **Latency analysis** - Find slow services
3. **Error correlation** - Link errors across services
4. **Dependency mapping** - Understand service relationships

---

---

### Integrate Effect Tracing with OpenTelemetry

**Rule:** Integrate Effect.withSpan with OpenTelemetry to export traces and visualize request flows across services.

**Good Example:**

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

**Anti-Pattern:**

Using Effect.withSpan without exporting to OpenTelemetry, or lacking distributed tracing, which limits your ability to diagnose and visualize complex request flows.

**Rationale:**

Connect Effect's tracing spans to OpenTelemetry to enable distributed tracing, visualization, and correlation across your entire stack.


OpenTelemetry is the industry standard for distributed tracing.  
By integrating Effect's spans with OpenTelemetry, you gain deep visibility into request flows, performance bottlenecks, and dependencies—across all your services and infrastructure.

---


